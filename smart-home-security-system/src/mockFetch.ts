// Client-side High-Fidelity API Mock Layer
// This file intercepts all standard /api/* network requests and resolves them locally in the browser.
// It persists the database state to the browser's localStorage, enabling the entire application
// to run as a 100% self-contained, offline-capable static website (SPA) with no active backend server required!

import { DeviceState, Person, FaceRecord, SystemLog, SensorReading, Detection } from "./types";

// Seed data based on data.json
const SEED_DATA = {
  persons: [
    {
      id: "p_1",
      name: "Alice",
      phone: "13800138000",
      role: "owner" as const,
      status: true,
      createdAt: "2026-06-08T06:05:23.256Z"
    },
    {
      id: "p_2",
      name: "Bob",
      phone: "13800138001",
      role: "family" as const,
      status: true,
      createdAt: "2026-06-10T06:05:23.256Z"
    },
    {
      id: "p_3",
      name: "Carol",
      phone: "13912345678",
      role: "family" as const,
      status: true,
      createdAt: "2026-06-23T06:05:23.256Z"
    },
    {
      id: "p_4",
      name: "Dave (Courier)",
      phone: "13588889999",
      role: "visitor" as const,
      status: false,
      createdAt: "2026-07-03T06:05:23.256Z"
    }
  ],
  faces: [] as FaceRecord[],
  devices: {
    livingRoomLight: { power: true, brightness: 80 },
    bedroomLight: { power: false, brightness: 50 },
    kitchenLight: { power: false, brightness: 60 },
    ac: { power: true, temperature: 24 },
    fan: { power: false, autoMode: true },
    door: { locked: true, open: false },
    window: { open: false }
  } as DeviceState,
  scene: "home" as "home" | "away" | "sleep",
  logs: [
    {
      id: "log_1",
      timestamp: "2026-07-08T02:05:23.257Z",
      action: "scene_change" as const,
      target: "Home Scene",
      operator: "Alice (Owner)",
      details: "{\"previousScene\":\"away\",\"currentScene\":\"home\",\"triggeredDevices\":[\"livingRoomLight\",\"ac\"]}"
    },
    {
      id: "log_2",
      timestamp: "2026-07-08T02:17:23.257Z",
      action: "open_door_pass" as const,
      target: "Front Gate",
      operator: "Alice (Owner)",
      details: "{\"confidence\":0.98,\"personId\":\"p_1\",\"name\":\"Alice\"}"
    },
    {
      id: "log_3",
      timestamp: "2026-07-08T02:35:23.257Z",
      action: "device_control" as const,
      target: "Living Room Light",
      operator: "Alice (Owner)",
      details: "{\"power\":true,\"brightness\":80}"
    },
    {
      id: "log_4",
      timestamp: "2026-07-08T03:35:23.257Z",
      action: "open_door_pass" as const,
      target: "Front Gate",
      operator: "Bob (Family)",
      details: "{\"confidence\":0.94,\"personId\":\"p_2\",\"name\":\"Bob\"}"
    },
    {
      id: "log_5",
      timestamp: "2026-07-08T04:05:23.257Z",
      action: "fan_auto" as const,
      target: "Smart Fan",
      operator: "System",
      details: "{\"trigger\":\"Temperature > 26°C\",\"action\":\"start\",\"currentTemperature\":26.8}"
    },
    {
      id: "log_6",
      timestamp: "2026-07-08T04:35:23.257Z",
      action: "gate_reject" as const,
      target: "Front Gate",
      operator: "Unknown Visitor",
      details: "{\"confidence\":0.35,\"error\":\"No matching face found in database\"}"
    },
    {
      id: "log_7",
      timestamp: "2026-07-08T05:35:23.257Z",
      action: "device_control" as const,
      target: "Air Conditioner",
      operator: "Bob (Family)",
      details: "{\"power\":true,\"temperature\":24}"
    }
  ] as SystemLog[],
  sensorHistory: [
    { timestamp: "2026-07-07T22:05:23.256Z", temperature: 22.2, humidity: 61.6 },
    { timestamp: "2026-07-07T23:05:23.256Z", temperature: 21.9, humidity: 62.9 },
    { timestamp: "2026-07-08T00:05:23.256Z", temperature: 22.1, humidity: 63.2 },
    { timestamp: "2026-07-08T01:05:23.256Z", temperature: 21.6, humidity: 63.1 },
    { timestamp: "2026-07-08T02:05:23.256Z", temperature: 22.6, humidity: 62.9 },
    { timestamp: "2026-07-08T03:05:23.256Z", temperature: 23, humidity: 60.5 },
    { timestamp: "2026-07-08T04:05:23.256Z", temperature: 23.1, humidity: 59.4 },
    { timestamp: "2026-07-08T05:05:23.256Z", temperature: 24.1, humidity: 58.6 },
    { timestamp: "2026-07-08T06:05:23.256Z", temperature: 24.6, humidity: 57.0 }
  ] as SensorReading[],
  detections: [] as Detection[]
};

const LOCAL_STORAGE_KEY = "smart_home_db";

// Helper to load current database state from localStorage
function getDb() {
  const content = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!content) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_DATA));
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
  try {
    return JSON.parse(content);
  } catch {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_DATA));
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
}

// Helper to save current database state to localStorage
function saveDb(db: any) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

// Logger utility
function addLog(
  db: any,
  action: "open_door_pass" | "gate_reject" | "fan_auto" | "scene_change" | "device_control",
  target: string,
  operator: string,
  details: string
) {
  const newLog: SystemLog = {
    id: "log_" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    action,
    target,
    operator,
    details
  };
  db.logs.unshift(newLog);
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
}

// Simulate AI Verification fallback (similar to server/gemini.ts)
function simulateVerification(queryImageBase64: string, enrolledFaces: FaceRecord[], persons: Person[]): any {
  const activePersons = persons.filter(p => p.status);
  const activeFaces = enrolledFaces.filter(f => activePersons.some(p => p.id === f.personId));

  if (activeFaces.length === 0) {
    return {
      status: "reject",
      confidence: 0.95,
      message: "无法进行匹配：系统人脸库中没有启用的授权人员。"
    };
  }

  const rand = Math.random();
  if (rand < 0.15) {
    return {
      status: "no_face",
      confidence: 0.98,
      message: "未检测到人脸，请确保光线充足且正对摄像头。"
    };
  } else if (rand < 0.7 && activeFaces.length > 0) {
    const chosenFace = activeFaces[Math.floor(Math.random() * activeFaces.length)];
    const person = activePersons.find(p => p.id === chosenFace.personId)!;
    return {
      status: "pass",
      personId: person.id,
      name: person.name,
      role: person.role,
      confidence: Number((0.85 + Math.random() * 0.14).toFixed(2)),
      message: `人脸比对成功，识别到用户：${person.name} (${person.role === "owner" ? "户主" : person.role === "family" ? "家人" : "访客"})`
    };
  } else {
    return {
      status: "reject",
      confidence: 0.88,
      message: "识别失败：检测到陌生人脸，未匹配到系统授权人员，已拒绝通行。"
    };
  }
}

// Simulate AI Object Detection (similar to server/gemini.ts)
function simulateDetection(): any[] {
  const candidates = [
    { category: "person", category_zh: "人员" },
    { category: "dog", category_zh: "宠物狗" },
    { category: "cat", category_zh: "宠物猫" },
    { category: "laptop", category_zh: "笔记本电脑" },
    { category: "backpack", category_zh: "双肩包" },
    { category: "bottle", category_zh: "水杯" },
    { category: "cell phone", category_zh: "手机" },
    { category: "chair", category_zh: "椅子" }
  ];

  const count = Math.floor(Math.random() * 3) + 1;
  const results: any[] = [];
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());

  for (let i = 0; i < count; i++) {
    const item = shuffled[i];
    const width = Math.floor(20 + Math.random() * 40);
    const height = Math.floor(25 + Math.random() * 50);
    const xmin = Math.floor(Math.random() * (100 - width));
    const ymin = Math.floor(Math.random() * (100 - height));
    const confidence = Number((0.45 + Math.random() * 0.53).toFixed(2));

    results.push({
      category: item.category,
      category_zh: item.category_zh,
      confidence,
      bbox: [ymin, xmin, ymin + height, xmin + width]
    });
  }

  return results;
}

// Intercept window.fetch
const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === "string" ? input : (input as any).url || input.toString();
  
  // Only intercept /api/ requests
  if (!urlString.includes("/api/")) {
    return originalFetch(input, init);
  }

  // Parse URL & Query params
  const parsedUrl = new URL(urlString, window.location.origin);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.searchParams;
  const method = (init?.method || "GET").toUpperCase();

  // Get current DB
  const db = getDb();

  let responseBody: any = null;
  let status = 200;

  try {
    // 1. Health check
    if (pathname === "/api/health") {
      responseBody = { status: "ok", env: "production", isClientMock: true };
    }

    // 2. Devices State
    else if (pathname === "/api/devices" && method === "GET") {
      responseBody = { success: true, data: db.devices };
    }

    // 3. Device commands (supports both /api/devices/:id/command and /api/device/:id/command)
    else if ((pathname.startsWith("/api/devices/") || pathname.startsWith("/api/device/")) && pathname.endsWith("/command") && method === "POST") {
      const parts = pathname.split("/");
      // Path format: /api/devices/livingRoomLight/command -> parts is ["", "api", "devices", "livingRoomLight", "command"]
      const deviceId = parts[parts.length - 2];
      const body = init?.body ? JSON.parse(init.body as string) : {};

      const d = db.devices as any;
      if (d[deviceId] !== undefined || deviceId === "livingRoomLight" || deviceId === "bedroomLight" || deviceId === "kitchenLight" || deviceId === "ac" || deviceId === "fan" || deviceId === "door" || deviceId === "window") {
        if (!d[deviceId]) d[deviceId] = {};
        
        if (deviceId === "livingRoomLight" || deviceId === "bedroomLight" || deviceId === "kitchenLight") {
          if (body.power !== undefined) d[deviceId].power = body.power;
          if (body.brightness !== undefined) d[deviceId].brightness = body.brightness;
        } else if (deviceId === "ac") {
          if (body.power !== undefined) d.ac.power = body.power;
          if (body.temperature !== undefined) d.ac.temperature = body.temperature;
        } else if (deviceId === "fan") {
          if (body.power !== undefined) d.fan.power = body.power;
          if (body.autoMode !== undefined) d.fan.autoMode = body.autoMode;
        } else if (deviceId === "door") {
          if (body.locked !== undefined) d.door.locked = body.locked;
          if (body.open !== undefined) d.door.open = body.open;
        } else if (deviceId === "window") {
          if (body.open !== undefined) d.window.open = body.open;
        }

        addLog(db, "device_control", deviceId, "Operator", JSON.stringify(body));
        saveDb(db);
        responseBody = { success: true, data: db.devices };
      } else {
        status = 404;
        responseBody = { success: false, error: "Device not found" };
      }
    }

    // 4. Scenes (GET /api/scene and POST /api/scene)
    else if (pathname === "/api/scene" && method === "GET") {
      responseBody = { success: true, currentScene: db.scene || "home" };
    }

    else if ((pathname === "/api/scene" || pathname.startsWith("/api/scene/")) && method === "POST") {
      let sceneName: any = "";
      
      if (pathname.startsWith("/api/scene/")) {
        sceneName = pathname.split("/").pop();
      } else if (init?.body) {
        const body = JSON.parse(init.body as string);
        sceneName = body.scene;
      }

      if (sceneName === "home" || sceneName === "away" || sceneName === "sleep") {
        const prev = db.scene;
        db.scene = sceneName;

        // Automate actions based on scene
        if (sceneName === "home") {
          db.devices.livingRoomLight.power = true;
          db.devices.ac.power = true;
          db.devices.door.locked = false;
        } else if (sceneName === "away") {
          db.devices.livingRoomLight.power = false;
          db.devices.bedroomLight.power = false;
          db.devices.kitchenLight.power = false;
          db.devices.ac.power = false;
          db.devices.fan.power = false;
          db.devices.door.locked = true;
          db.devices.door.open = false;
        } else if (sceneName === "sleep") {
          db.devices.livingRoomLight.power = false;
          db.devices.bedroomLight.power = true;
          db.devices.bedroomLight.brightness = 10;
          db.devices.kitchenLight.power = false;
          db.devices.ac.temperature = 26;
          db.devices.door.locked = true;
        }

        addLog(
          db,
          "scene_change",
          `${sceneName.toUpperCase()} Scene`,
          "User",
          JSON.stringify({ previousScene: prev, currentScene: sceneName })
        );

        saveDb(db);
        responseBody = { success: true, data: { scene: sceneName, devices: db.devices }, currentScene: sceneName };
      } else {
        status = 400;
        responseBody = { success: false, error: "Invalid scene name" };
      }
    }

    // 5. Sensors
    else if (pathname === "/api/sensors/latest" && method === "GET") {
      const history = db.sensorHistory;
      let latest = history[history.length - 1] || { temperature: 24.5, humidity: 50.0 };

      // Simulate live fluctuation
      const diffTemp = (Math.random() - 0.5) * 0.2;
      const diffHum = (Math.random() - 0.5) * 0.4;
      const currentTemp = Number((latest.temperature + diffTemp).toFixed(1));
      const currentHum = Number((latest.humidity + diffHum).toFixed(1));

      // Auto-fan controller logic based on temperature
      if (db.devices.fan.autoMode) {
        const threshold = 26.0;
        if (currentTemp > threshold && !db.devices.fan.power) {
          db.devices.fan.power = true;
          addLog(db, "fan_auto", "Smart Fan", "System", `Temp reached ${currentTemp}°C (> ${threshold}°C). Auto-started fan.`);
          saveDb(db);
        } else if (currentTemp <= threshold && db.devices.fan.power) {
          db.devices.fan.power = false;
          addLog(db, "fan_auto", "Smart Fan", "System", `Temp dropped to ${currentTemp}°C (<= ${threshold}°C). Auto-stopped fan.`);
          saveDb(db);
        }
      }

      responseBody = {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          temperature: currentTemp,
          humidity: currentHum
        }
      };
    }

    else if (pathname === "/api/sensors/history" && method === "GET") {
      responseBody = { success: true, data: db.sensorHistory };
    }

    // 6. Persons API
    else if (pathname === "/api/persons" && method === "GET") {
      const q = (query.get("q") || "").toLowerCase();
      const page = parseInt(query.get("page") || "1") || 1;
      const limit = parseInt(query.get("limit") || "10") || 10;

      let list = [...db.persons];
      if (q) {
        list = list.filter(
          (p: any) =>
            p.name.toLowerCase().includes(q) ||
            p.phone.includes(q) ||
            p.role.toLowerCase().includes(q)
        );
      }

      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const startIdx = (page - 1) * limit;
      const data = list.slice(startIdx, startIdx + limit);

      // Attach face counts
      const enrichedData = data.map((p: any) => {
        const count = db.faces.filter((f: any) => f.personId === p.id).length;
        return { ...p, faceCount: count };
      });

      responseBody = {
        success: true,
        data: enrichedData,
        pagination: { page, limit, total, totalPages }
      };
    }

    else if (pathname === "/api/persons" && method === "POST") {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (!body.name) {
        status = 400;
        responseBody = { success: false, error: "Name is required" };
      } else {
        const newPerson = {
          id: "p_" + Math.random().toString(36).substring(2, 9),
          name: body.name,
          phone: body.phone || "",
          role: body.role || "visitor",
          status: body.status !== undefined ? body.status : true,
          createdAt: new Date().toISOString()
        };
        db.persons.unshift(newPerson);
        addLog(db, "device_control", "Person Registry", "System", `Added new person: ${newPerson.name} (${newPerson.role})`);
        saveDb(db);
        responseBody = { success: true, data: newPerson };
      }
    }

    else if (pathname.startsWith("/api/persons/") && method === "PUT") {
      const id = pathname.split("/").pop();
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const idx = db.persons.findIndex((p: any) => p.id === id);
      if (idx !== -1) {
        db.persons[idx] = { ...db.persons[idx], ...body };
        addLog(db, "device_control", "Person Registry", "System", `Updated details for person: ${db.persons[idx].name}`);
        saveDb(db);
        responseBody = { success: true, data: db.persons[idx] };
      } else {
        status = 404;
        responseBody = { success: false, error: "Person not found" };
      }
    }

    else if (pathname.startsWith("/api/persons/") && method === "DELETE") {
      const id = pathname.split("/").pop();
      const person = db.persons.find((p: any) => p.id === id);
      if (person) {
        db.persons = db.persons.filter((p: any) => p.id !== id);
        db.faces = db.faces.filter((f: any) => f.personId !== id);
        addLog(db, "device_control", "Person Registry", "System", `Deleted person: ${person.name}`);
        saveDb(db);
        responseBody = { success: true, message: "Person and enrolled faces deleted successfully" };
      } else {
        status = 404;
        responseBody = { success: false, error: "Person not found" };
      }
    }

    // 7. Face API
    else if (pathname === "/api/face/library" && method === "GET") {
      const library = db.persons.map((p: any) => {
        const personFaces = db.faces.filter((f: any) => f.personId === p.id);
        return {
          person: p,
          faces: personFaces
        };
      }).filter((item: any) => item.faces.length > 0);

      responseBody = { success: true, data: library };
    }

    else if (pathname === "/api/face/enroll" && method === "POST") {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (!body.personId || !body.image) {
        status = 400;
        responseBody = { success: false, error: "personId and image are required" };
      } else {
        const newFace = {
          id: "f_" + Math.random().toString(36).substring(2, 9),
          personId: body.personId,
          image: body.image,
          createdAt: new Date().toISOString()
        };
        db.faces.push(newFace);
        const person = db.persons.find((p: any) => p.id === body.personId);
        if (person) {
          addLog(db, "device_control", "Face Database", "System", `Enrolled face for: ${person.name}`);
        }
        saveDb(db);
        responseBody = { success: true, data: newFace };
      }
    }

    else if (pathname === "/api/face/verify" && method === "POST") {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (!body.image) {
        status = 400;
        responseBody = { success: false, error: "Image is required" };
      } else {
        let result: any;
        if (body.scenario === "pass") {
          const persons = db.persons.filter((p: any) => p.status);
          const matched = persons.length > 0 ? persons[0] : { id: "p_1", name: "Alice", role: "owner" };
          result = {
            status: "pass",
            personId: matched.id,
            name: matched.name,
            role: matched.role,
            confidence: 0.98,
            message: `人脸比对成功 (测试模式)，识别到用户：${matched.name} (${matched.role === "owner" ? "户主" : "家庭成员"})`
          };
        } else if (body.scenario === "reject") {
          result = {
            status: "reject",
            confidence: 0.85,
            message: "识别失败 (测试模式)：检测到陌生人脸，未匹配到系统授权人员，已拒绝通行。"
          };
        } else if (body.scenario === "no_face") {
          result = {
            status: "no_face",
            confidence: 0.99,
            message: "未检测到人脸 (测试模式)：请确保光线充足且正对摄像头。"
          };
        } else {
          result = simulateVerification(body.image, db.faces, db.persons);
        }

        if (result.status === "pass" && result.personId) {
          db.devices.door.locked = false;
          db.devices.door.open = true;
          addLog(
            db,
            "open_door_pass",
            "Front Gate",
            `${result.name} (Face Match)`,
            `Gate unlocked. Match confidence: ${Math.round(result.confidence * 100)}%`
          );
        } else {
          addLog(
            db,
            "gate_reject",
            "Front Gate",
            "Unknown Face",
            `Access Denied. Result: ${result.message}`
          );
        }
        saveDb(db);
        responseBody = { success: true, result };
      }
    }

    else if (pathname.startsWith("/api/face/") && method === "DELETE") {
      const id = pathname.split("/").pop();
      const face = db.faces.find((f: any) => f.id === id);
      if (face) {
        db.faces = db.faces.filter((f: any) => f.id !== id);
        const person = db.persons.find((p: any) => p.id === face.personId);
        if (person) {
          addLog(db, "device_control", "Face Database", "System", `Deleted enrolled face for: ${person.name}`);
        }
        saveDb(db);
        responseBody = { success: true, message: "Face photo deleted" };
      } else {
        status = 404;
        responseBody = { success: false, error: "Face record not found" };
      }
    }

    // 8. Logs API
    else if (pathname === "/api/logs" && method === "GET") {
      const action = query.get("action") || "";
      const date = query.get("date") || "";
      const page = parseInt(query.get("page") || "1") || 1;
      const limit = parseInt(query.get("limit") || "10") || 10;

      let list = [...db.logs];
      if (action) {
        list = list.filter((l: any) => l.action === action);
      }
      if (date) {
        list = list.filter((l: any) => l.timestamp.startsWith(date));
      }

      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const startIdx = (page - 1) * limit;
      const data = list.slice(startIdx, startIdx + limit);

      responseBody = {
        success: true,
        data,
        pagination: { page, limit, total, totalPages }
      };
    }

    // 9. Object Detection API
    else if (pathname === "/api/detect" && method === "POST") {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const isLinkageOn = body.linkage === true || query.get("linkage") === "1";

      if (!body.image) {
        status = 400;
        responseBody = { success: false, error: "Image is required" };
      } else {
        const results = simulateDetection();

        let linkageTriggered = false;
        if (isLinkageOn && results.length > 0) {
          const hasPerson = results.some((r: any) => r.category === "person");
          if (hasPerson) {
            db.devices.livingRoomLight.power = true;
            db.devices.livingRoomLight.brightness = 100;
            addLog(
              db,
              "device_control",
              "Living Room Light",
              "YOLO Linkage",
              "Detected 'Person'. Linkage rule triggered: Auto Turn-on Light (100% Brightness)."
            );
            linkageTriggered = true;
          }
        }

        // Add to detection history
        const savedDetection = {
          id: "det_" + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          originalImage: body.image,
          annotatedImage: body.image,
          results
        };
        db.detections.unshift(savedDetection);
        if (db.detections.length > 20) {
          db.detections = db.detections.slice(0, 20);
        }

        saveDb(db);
        responseBody = {
          success: true,
          data: savedDetection,
          linkageTriggered
        };
      }
    }

    else if (pathname === "/api/detections" && method === "GET") {
      responseBody = { success: true, data: db.detections };
    }

    // Fallback if API not found
    else {
      status = 404;
      responseBody = { success: false, error: `Mock API endpoint ${pathname} [${method}] not found` };
    }

  } catch (err: any) {
    status = 500;
    responseBody = { success: false, error: err.message };
  }

  // Return a mocked Response object
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
};
