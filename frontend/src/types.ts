export interface Person {
  id: number;
  name: string;
  phone: string;
  role: "owner" | "family" | "visitor";
  status: boolean;
  faceCount: number;
  createdAt?: string;
}

export interface FaceRecord {
  id: number;
  personId: number;
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
  id: number;
  timestamp: string;
  action: string;
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
  id: number;
  timestamp: string;
  originalImage: string; // base64
  annotatedImage: string; // base64
  results?: DetectionResult[];
}
