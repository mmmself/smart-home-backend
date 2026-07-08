import fs from "fs/promises";
import path from "path";

export interface Person {
  id: string;
  name: string;
  phone: string;
  role: "owner" | "family" | "visitor";
  status: boolean;
  createdAt: string;
}

export interface FaceRecord {
  id: string;
  personId: string;
  image: string; // base64
  createdAt: string;
}

export interface DeviceState {
  livingRoomLight: { power: boolean; brightness: number };
  bedroomLight: { power: boolean; brightness: number };
  kitchenLight: { power: boolean; brightness: number };
  fan: { power: boolean; autoMode: boolean };
  door: { locked: boolean; open: boolean };
  window: { open: boolean };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: "open_door_pass" | "gate_reject" | "fan_auto" | "scene_change" | "device_control";
  target: string;
  operator: string;
  details: string; // JSON string
}

export interface SensorReading {
  timestamp: string;
  temperature: number;
  humidity: number;
}

export interface DetectionResult {
  category: string;
  category_zh: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface Detection {
  id: string;
  timestamp: string;
  originalImage: string; // base64
  annotatedImage: string; // base64
  results: DetectionResult[];
}

interface DatabaseSchema {
  persons: Person[];
  faces: FaceRecord[];
  devices: DeviceState;
  scene: "home" | "away" | "sleep";
  logs: SystemLog[];
  sensorHistory: SensorReading[];
  detections: Detection[];
}

const DB_FILE = path.join(process.cwd(), "data.json");

let db: DatabaseSchema = {
  persons: [],
  faces: [],
  devices: {
    livingRoomLight: { power: true, brightness: 80 },
    bedroomLight: { power: false, brightness: 50 },
    kitchenLight: { power: false, brightness: 60 },
    fan: { power: false, autoMode: true },
    door: { locked: true, open: false },
    window: { open: false },
  },
  scene: "home",
  logs: [],
  sensorHistory: [],
  detections: [],
};

// Generates 24 hours of sensor history
function generateSensorHistory(): SensorReading[] {
  const history: SensorReading[] = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    // Base temperature cycles between 22 and 28 degrees
    const hour = time.getHours();
    const tempOffset = Math.sin((hour - 6) * Math.PI / 12) * 3; // warmest at 15:00, coolest at 3:00
    const temperature = Number((24.5 + tempOffset + Math.random() * 0.8).toFixed(1));
    const humidity = Number((55 - tempOffset * 2.5 + Math.random() * 2).toFixed(1));
    history.push({
      timestamp: time.toISOString(),
      temperature,
      humidity,
    });
  }
  return history;
}

// Generates default logs
function generateDefaultLogs(): SystemLog[] {
  const now = new Date();
  const logs: SystemLog[] = [
    {
      id: "log_1",
      timestamp: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
      action: "scene_change",
      target: "Home Scene",
      operator: "Alice (Owner)",
      details: JSON.stringify({ previousScene: "away", currentScene: "home", triggeredDevices: ["livingRoomLight"] }),
    },
    {
      id: "log_2",
      timestamp: new Date(now.getTime() - 3.8 * 3600 * 1000).toISOString(),
      action: "open_door_pass",
      target: "Front Gate",
      operator: "Alice (Owner)",
      details: JSON.stringify({ confidence: 0.98, personId: "p_1", name: "Alice" }),
    },
    {
      id: "log_3",
      timestamp: new Date(now.getTime() - 3.5 * 3600 * 1000).toISOString(),
      action: "device_control",
      target: "Living Room Light",
      operator: "Alice (Owner)",
      details: JSON.stringify({ power: true, brightness: 80 }),
    },
    {
      id: "log_4",
      timestamp: new Date(now.getTime() - 2.5 * 3600 * 1000).toISOString(),
      action: "open_door_pass",
      target: "Front Gate",
      operator: "Bob (Family)",
      details: JSON.stringify({ confidence: 0.94, personId: "p_2", name: "Bob" }),
    },
    {
      id: "log_5",
      timestamp: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      action: "fan_auto",
      target: "Smart Fan",
      operator: "System",
      details: JSON.stringify({ trigger: "Temperature > 26°C", action: "start", currentTemperature: 26.8 }),
    },
    {
      id: "log_6",
      timestamp: new Date(now.getTime() - 1.5 * 3600 * 1000).toISOString(),
      action: "gate_reject",
      target: "Front Gate",
      operator: "Unknown Visitor",
      details: JSON.stringify({ confidence: 0.35, error: "No matching face found in database" }),
    },
    {
      id: "log_7",
      timestamp: new Date(now.getTime() - 0.5 * 3600 * 1000).toISOString(),
      action: "device_control",
      target: "Air Conditioner",
      operator: "Bob (Family)",
      details: JSON.stringify({ power: true, temperature: 24 }),
    },
  ];
  return logs;
}

// Generates default persons
function generateDefaultPersons(): Person[] {
  const now = new Date();
  return [
    {
      id: "p_1",
      name: "Alice",
      phone: "13800138000",
      role: "owner",
      status: true,
      createdAt: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "p_2",
      name: "Bob",
      phone: "13800138001",
      role: "family",
      status: true,
      createdAt: new Date(now.getTime() - 28 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "p_3",
      name: "Carol",
      phone: "13912345678",
      role: "family",
      status: true,
      createdAt: new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "p_4",
      name: "Dave (Courier)",
      phone: "13588889999",
      role: "visitor",
      status: false,
      createdAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
    },
  ];
}

export async function initDb() {
  try {
    const content = await fs.readFile(DB_FILE, "utf-8");
    db = JSON.parse(content);
    // If loaded DB has empty logs or history, populate them dynamically
    if (!db.sensorHistory || db.sensorHistory.length === 0) {
      db.sensorHistory = generateSensorHistory();
    }
    if (!db.logs || db.logs.length === 0) {
      db.logs = generateDefaultLogs();
    }
    if (!db.persons || db.persons.length === 0) {
      db.persons = generateDefaultPersons();
    }
    if (!db.detections) {
      db.detections = [];
    }
    await saveDb();
  } catch (error) {
    // Generate fresh database
    db.persons = generateDefaultPersons();
    db.sensorHistory = generateSensorHistory();
    db.logs = generateDefaultLogs();
    db.faces = [];
    db.detections = [];
    await saveDb();
  }
}

export async function saveDb() {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function getPersons() {
  return db.persons;
}

export function addPerson(person: Omit<Person, "id" | "createdAt">) {
  const newPerson: Person = {
    ...person,
    id: "p_" + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
  };
  db.persons.unshift(newPerson);
  addLog("device_control", "Person Registry", "System", `Added new person: ${newPerson.name} (${newPerson.role})`);
  saveDb();
  return newPerson;
}

export function updatePerson(id: string, fields: Partial<Omit<Person, "id" | "createdAt">>) {
  const idx = db.persons.findIndex(p => p.id === id);
  if (idx !== -1) {
    db.persons[idx] = { ...db.persons[idx], ...fields };
    addLog("device_control", "Person Registry", "System", `Updated details for person: ${db.persons[idx].name}`);
    saveDb();
    return db.persons[idx];
  }
  return null;
}

export function deletePerson(id: string) {
  const person = db.persons.find(p => p.id === id);
  if (person) {
    db.persons = db.persons.filter(p => p.id !== id);
    db.faces = db.faces.filter(f => f.personId !== id);
    addLog("device_control", "Person Registry", "System", `Deleted person: ${person.name}`);
    saveDb();
    return true;
  }
  return false;
}

export function getFaces() {
  return db.faces;
}

export function enrollFace(personId: string, imageBase64: string) {
  const newFace: FaceRecord = {
    id: "f_" + Math.random().toString(36).substr(2, 9),
    personId,
    image: imageBase64,
    createdAt: new Date().toISOString(),
  };
  db.faces.push(newFace);
  const person = db.persons.find(p => p.id === personId);
  if (person) {
    addLog("device_control", "Face Database", "System", `Enrolled face for: ${person.name}`);
  }
  saveDb();
  return newFace;
}

export function deleteFace(id: string) {
  const face = db.faces.find(f => f.id === id);
  if (face) {
    db.faces = db.faces.filter(f => f.id !== id);
    const person = db.persons.find(p => p.id === face.personId);
    if (person) {
      addLog("device_control", "Face Database", "System", `Deleted enrolled face for: ${person.name}`);
    }
    saveDb();
    return true;
  }
  return false;
}

export function getDevices() {
  return db.devices;
}

export function updateDeviceCommand(deviceId: string, command: any) {
  const d = db.devices as any;
  if (deviceId === "livingRoomLight" || deviceId === "bedroomLight" || deviceId === "kitchenLight") {
    if (command.power !== undefined) d[deviceId].power = command.power;
    if (command.brightness !== undefined) d[deviceId].brightness = command.brightness;
  } else if (deviceId === "fan") {
    if (command.power !== undefined) d.fan.power = command.power;
    if (command.autoMode !== undefined) d.fan.autoMode = command.autoMode;
  } else if (deviceId === "door") {
    if (command.locked !== undefined) d.door.locked = command.locked;
    if (command.open !== undefined) d.door.open = command.open;
  } else if (deviceId === "window") {
    if (command.open !== undefined) d.window.open = command.open;
  }

  // Add Log
  addLog("device_control", deviceId, "Operator", JSON.stringify(command));
  saveDb();
  return db.devices;
}

export function getScene() {
  return db.scene;
}

export function setScene(sceneName: "home" | "away" | "sleep") {
  const prev = db.scene;
  db.scene = sceneName;
  
  // Automate actions based on scene
  if (sceneName === "home") {
    db.devices.livingRoomLight.power = true;
    db.devices.door.locked = false;
  } else if (sceneName === "away") {
    db.devices.livingRoomLight.power = false;
    db.devices.bedroomLight.power = false;
    db.devices.kitchenLight.power = false;
    db.devices.fan.power = false;
    db.devices.door.locked = true;
    db.devices.door.open = false;
  } else if (sceneName === "sleep") {
    db.devices.livingRoomLight.power = false;
    db.devices.bedroomLight.power = true;
    db.devices.bedroomLight.brightness = 10;
    db.devices.kitchenLight.power = false;
    db.devices.door.locked = true;
  }

  addLog(
    "scene_change", 
    `${sceneName.toUpperCase()} Scene`, 
    "User", 
    JSON.stringify({ previousScene: prev, currentScene: sceneName })
  );
  saveDb();
  return { scene: sceneName, devices: db.devices };
}

export function getLogs() {
  return db.logs;
}

export function addLog(
  action: "open_door_pass" | "gate_reject" | "fan_auto" | "scene_change" | "device_control",
  target: string,
  operator: string,
  details: string
) {
  const newLog: SystemLog = {
    id: "log_" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    action,
    target,
    operator,
    details,
  };
  db.logs.unshift(newLog);
  // Cap logs to 200 items to prevent bloat
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
}

export function getSensorLatest() {
  const history = db.sensorHistory;
  if (history.length > 0) {
    const latest = history[history.length - 1];
    
    // Simulate slight fluctuation in temperature and humidity for live values
    const diffTemp = (Math.random() - 0.5) * 0.2;
    const diffHum = (Math.random() - 0.5) * 0.4;
    
    const currentTemp = Number((latest.temperature + diffTemp).toFixed(1));
    const currentHum = Number((latest.humidity + diffHum).toFixed(1));
    
    // Auto-fan controller logic based on temperature
    if (db.devices.fan.autoMode) {
      const threshold = 26.0;
      if (currentTemp > threshold && !db.devices.fan.power) {
        db.devices.fan.power = true;
        addLog("fan_auto", "Smart Fan", "System", `Temp reached ${currentTemp}°C (> ${threshold}°C). Auto-started fan.`);
        saveDb();
      } else if (currentTemp <= threshold && db.devices.fan.power) {
        db.devices.fan.power = false;
        addLog("fan_auto", "Smart Fan", "System", `Temp dropped to ${currentTemp}°C (<= ${threshold}°C). Auto-stopped fan.`);
        saveDb();
      }
    }

    return {
      timestamp: new Date().toISOString(),
      temperature: currentTemp,
      humidity: currentHum,
    };
  }
  return {
    timestamp: new Date().toISOString(),
    temperature: 24.5,
    humidity: 50.0,
  };
}

export function getSensorHistory() {
  return db.sensorHistory;
}

// Add a sensor reading to history periodically
export function appendSensorReading(temperature: number, humidity: number) {
  db.sensorHistory.push({
    timestamp: new Date().toISOString(),
    temperature,
    humidity,
  });
  if (db.sensorHistory.length > 100) {
    db.sensorHistory.shift();
  }
  saveDb();
}

export function getDetections() {
  return db.detections;
}

export function addDetection(originalImage: string, annotatedImage: string, results: DetectionResult[]) {
  const newDetection: Detection = {
    id: "det_" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    originalImage,
    annotatedImage,
    results,
  };
  db.detections.unshift(newDetection);
  if (db.detections.length > 20) {
    db.detections = db.detections.slice(0, 20);
  }
  saveDb();
  return newDetection;
}
