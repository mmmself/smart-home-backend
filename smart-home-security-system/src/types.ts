export interface Person {
  id: string;
  name: string;
  phone: string;
  role: "owner" | "family" | "visitor";
  status: boolean;
  faceCount: number;
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
  ac: { power: boolean; temperature: number };
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
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
}

export interface Detection {
  id: string;
  timestamp: string;
  originalImage: string; // base64
  annotatedImage: string; // base64
  results: DetectionResult[];
}
