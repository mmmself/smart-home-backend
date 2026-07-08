import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Load environment variables
import "dotenv/config";

import {
  initDb,
  getPersons,
  addPerson,
  updatePerson,
  deletePerson,
  getFaces,
  enrollFace,
  deleteFace,
  getDevices,
  updateDeviceCommand,
  getScene,
  setScene,
  getLogs,
  addLog,
  getSensorLatest,
  getSensorHistory,
  getDetections,
  addDetection,
} from "./src/server/db.js";

import { verifyFaceImage, detectObjectsImage } from "./src/server/gemini.ts";

async function startServer() {
  // Initialize database
  await initDb();

  const app = express();
  const PORT = 3000;

  // Set body parser with high size limits for base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // 2. Persons API
  app.get("/api/persons", (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      let list = getPersons();
      if (q) {
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.phone.includes(q) ||
            p.role.toLowerCase().includes(q)
        );
      }

      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + limit;
      const data = list.slice(startIdx, endIdx);

      // Attach face counts
      const faces = getFaces();
      const enrichedData = data.map((p) => {
        const count = faces.filter((f) => f.personId === p.id).length;
        return { ...p, faceCount: count };
      });

      res.json({
        success: true,
        data: enrichedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/persons", (req, res) => {
    try {
      const { name, phone, role, status } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: "Name is required" });
      }
      const newPerson = addPerson({
        name,
        phone: phone || "",
        role: role || "visitor",
        status: status !== undefined ? status : true,
      });
      res.json({ success: true, data: newPerson });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/persons/:id", (req, res) => {
    try {
      const { name, phone, role, status } = req.body;
      const updated = updatePerson(req.params.id, { name, phone, role, status });
      if (!updated) {
        return res.status(404).json({ success: false, error: "Person not found" });
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/persons/:id", (req, res) => {
    try {
      const success = deletePerson(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: "Person not found" });
      }
      res.json({ success: true, message: "Person and enrolled faces deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Face Enroll and Verification
  app.post("/api/face/enroll", (req, res) => {
    try {
      const { personId, image } = req.body;
      if (!personId || !image) {
        return res.status(400).json({ success: false, error: "personId and image base64 are required" });
      }
      const newFace = enrollFace(personId, image);
      res.json({ success: true, data: newFace });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/face/verify", async (req, res) => {
    try {
      const { image, scenario } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: "Image base64 is required" });
      }

      let result: any;
      if (scenario === "pass") {
        const persons = getPersons().filter(p => p.status);
        const matched = persons.length > 0 ? persons[0] : { id: "p_1", name: "Alice", role: "owner" };
        result = {
          status: "pass",
          personId: matched.id,
          name: matched.name,
          role: matched.role,
          confidence: 0.98,
          message: `人脸比对成功 (测试模式)，识别到用户：${matched.name} (${matched.role === "owner" ? "户主" : "家庭成员"})`,
        };
      } else if (scenario === "reject") {
        result = {
          status: "reject",
          confidence: 0.85,
          message: "识别失败 (测试模式)：检测到陌生人脸，未匹配到系统授权人员，已拒绝通行。",
        };
      } else if (scenario === "no_face") {
        result = {
          status: "no_face",
          confidence: 0.99,
          message: "未检测到人脸 (测试模式)：请确保光线充足且正对摄像头。",
        };
      } else {
        // Perform real or simulated verification
        result = await verifyFaceImage(image);
      }

      if (result.status === "pass" && result.personId) {
        // Unlock door automatically
        updateDeviceCommand("door", { locked: false, open: true });
        addLog(
          "open_door_pass",
          "Front Gate",
          `${result.name} (Face Match)`,
          `Gate unlocked. Match confidence: ${Math.round(result.confidence * 100)}%`
        );
      } else {
        addLog(
          "gate_reject",
          "Front Gate",
          "Unknown Face",
          `Access Denied. Result: ${result.message}`
        );
      }

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/face/library", (req, res) => {
    try {
      const faces = getFaces();
      const persons = getPersons();
      
      const library = persons.map((p) => {
        const personFaces = faces.filter((f) => f.personId === p.id);
        return {
          person: p,
          faces: personFaces,
        };
      }).filter(item => item.faces.length > 0);

      res.json({ success: true, data: library });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/face/:id", (req, res) => {
    try {
      const success = deleteFace(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: "Face record not found" });
      }
      res.json({ success: true, message: "Face photo deleted" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Object Detection
  app.post("/api/detect", async (req, res) => {
    try {
      const { image, linkage } = req.body;
      const isLinkageOn = linkage === true || req.query.linkage === "1";

      if (!image) {
        return res.status(400).json({ success: false, error: "Image base64 is required" });
      }

      // Run detection
      const results = await detectObjectsImage(image);

      // Trigger automatic linkage if enabled
      let linkageTriggered = false;
      if (isLinkageOn && results.length > 0) {
        // Find if a person or something interesting was detected
        const hasPerson = results.some(r => r.category === "person");
        if (hasPerson) {
          updateDeviceCommand("livingRoomLight", { power: true, brightness: 100 });
          addLog(
            "device_control",
            "Living Room Light",
            "YOLO Linkage",
            "Detected 'Person'. Linkage rule triggered: Auto Turn-on Light (100% Brightness)."
          );
          linkageTriggered = true;
        }
      }

      // Save to detection history
      const saved = addDetection(image, image, results);

      res.json({
        success: true,
        data: saved,
        linkageTriggered,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/detections", (req, res) => {
    try {
      const data = getDetections();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Devices API
  app.get("/api/devices", (req, res) => {
    try {
      const data = getDevices();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/devices/:id/command", (req, res) => {
    try {
      const updated = updateDeviceCommand(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Scenes API
  app.post("/api/scene/:name", (req, res) => {
    try {
      const sceneName = req.params.name as "home" | "away" | "sleep";
      if (sceneName !== "home" && sceneName !== "away" && sceneName !== "sleep") {
        return res.status(400).json({ success: false, error: "Invalid scene name" });
      }
      const data = setScene(sceneName);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Logs API
  app.get("/api/logs", (req, res) => {
    try {
      const action = typeof req.query.action === "string" ? req.query.action : "";
      const date = typeof req.query.date === "string" ? req.query.date : ""; // YYYY-MM-DD
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      let list = getLogs();
      
      if (action) {
        list = list.filter((l) => l.action === action);
      }
      
      if (date) {
        list = list.filter((l) => l.timestamp.startsWith(date));
      }

      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + limit;
      const data = list.slice(startIdx, endIdx);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Sensors API
  app.get("/api/sensors/latest", (req, res) => {
    try {
      const latest = getSensorLatest();
      res.json({ success: true, data: latest });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/sensors/history", (req, res) => {
    try {
      const data = getSensorHistory();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

// Start the server
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
