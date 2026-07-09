// Real API Service Layer - connects to backend at http://localhost:8000

const API_BASE = '/api';

interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
}

// Generic fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      code: 1,
      msg: error.message || 'Network error',
    };
  }
}

// ==================== Device API ====================

export interface DeviceState {
  livingRoomLight?: { power: boolean; brightness: number };
  bedroomLight?: { power: boolean; brightness: number };
  kitchenLight?: { power: boolean; brightness: number };
  fan?: { power: boolean; autoMode: boolean };
  door?: { locked: boolean; open: boolean };
  window?: { open: boolean };
}

function convertDevices(devices: any[]): DeviceState {
  const state: DeviceState = {};
  for (const d of devices) {
    if (d.type === 'light') {
      const nameMap: Record<string, string> = {
        '客厅灯': 'livingRoomLight',
        '卧室灯': 'bedroomLight',
        '厨房灯': 'kitchenLight',
      };
      const key = nameMap[d.state?.name] || d.device_id;
      state[key] = {
        power: d.state?.power ?? d.state?.on ?? false,
        brightness: d.state?.brightness ?? 50,
      };
    } else if (d.type === 'fan') {
      state.fan = {
        power: d.state?.power ?? d.state?.on ?? false,
        autoMode: d.state?.auto ?? true,
      };
    } else if (d.type === 'door') {
      state.door = {
        locked: d.state?.locked ?? true,
        open: d.state?.open ?? false,
      };
    } else if (d.type === 'window') {
      state.window = {
        open: d.state?.open ?? false,
      };
    }
  }
  return state;
}

export async function getDevices(): Promise<{ success: boolean; data?: DeviceState; error?: string }> {
  const res = await apiRequest<any[]>('/devices');
  if (res.code === 0) {
    return { success: true, data: convertDevices(res.data || []) };
  }
  return { success: false, error: res.msg };
}

export async function sendDeviceCommand(
  deviceId: string,
  command: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const res = await apiRequest<any>('/devices/' + deviceId + '/command', {
    method: 'POST',
    body: JSON.stringify({ action: 'set_state', state: command }),
  });
  if (res.code === 0) {
    return { success: true, data: res.data };
  }
  return { success: false, error: res.msg };
}

// ==================== Scene API ====================

export async function getCurrentScene(): Promise<{ success: boolean; currentScene?: string; error?: string }> {
  return { success: true, currentScene: 'home' };
}

export async function setScene(sceneName: string): Promise<{ success: boolean; error?: string }> {
  const scenes: Record<string, Record<string, any>> = {
    home: {
      livingRoomLight: { power: true, brightness: 80 },
      door: { locked: false },
    },
    away: {
      livingRoomLight: { power: false },
      bedroomLight: { power: false },
      kitchenLight: { power: false },
      fan: { power: false },
      door: { locked: true },
    },
    sleep: {
      livingRoomLight: { power: false },
      bedroomLight: { power: true, brightness: 10 },
      kitchenLight: { power: false },
      door: { locked: true },
    },
  };

  const commands = scenes[sceneName];
  if (!commands) {
    return { success: false, error: 'Invalid scene' };
  }

  const deviceMap: Record<string, string> = {
    livingRoomLight: 'light01',
    bedroomLight: 'light02',
    kitchenLight: 'light03',
    fan: 'fan01',
    door: 'door01',
  };

  try {
    for (const [key, state] of Object.entries(commands)) {
      const deviceId = deviceMap[key];
      if (deviceId) {
        await sendDeviceCommand(deviceId, state);
      }
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ==================== Sensor API ====================

export interface SensorReading {
  timestamp: string;
  temperature: number;
  humidity: number;
}

export async function getLatestSensor(): Promise<{ success: boolean; data?: SensorReading; error?: string }> {
  const res = await apiRequest<any>('/sensors/latest');
  if (res.code === 0 && res.data) {
    return {
      success: true,
      data: {
        timestamp: res.data.ts || new Date().toISOString(),
        temperature: res.data.temperature ?? 24,
        humidity: res.data.humidity ?? 50,
      },
    };
  }
  return { success: false, error: res.msg };
}

export async function getSensorHistory(metric: string = 'temperature'): Promise<{ success: boolean; data?: SensorReading[]; error?: string }> {
  const res = await apiRequest<any[]>('/sensors/history?metric=' + metric);
  if (res.code === 0) {
    const data = (res.data || []).map((item: any) => {
      // Return actual data from backend; humidity comes from /sensors/history?metric=humidity
      return {
        timestamp: item.ts,
        temperature: metric === 'temperature' ? item.avg : undefined,
        humidity: metric === 'humidity' ? item.avg : undefined,
        [metric]: item.avg,
      };
    });
    return { success: true, data };
  }
  return { success: false, error: res.msg };
}

// ==================== Person API ====================

export interface Person {
  id: number;
  name: string;
  phone: string;
  role: 'owner' | 'family' | 'visitor';
  status: boolean;
  faceCount?: number;
  createdAt?: string;
}

export async function getPersons(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data?: Person[]; pagination?: any; error?: string }> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('keyword', params.q);
  if (params?.page) searchParams.set('page', String(params.page));
  searchParams.set('size', String(params?.limit || 10));

  const query = searchParams.toString();
  const res = await apiRequest<{ total: number; items: any[] }>('/persons' + (query ? '?' + query : ''));
  if (res.code === 0 && res.data) {
    const items = res.data.items.map((p: any) => ({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
      role: p.role || 'visitor',
      status: p.is_active ?? true,
      faceCount: p.face_count || 0,
      createdAt: p.created_at,
    }));
    return {
      success: true,
      data: items,
      pagination: { total: res.data.total, page: params?.page || 1, limit: params?.limit || 10 },
    };
  }
  return { success: false, error: res.msg };
}

export async function createPerson(data: {
  name: string;
  phone?: string;
  role?: string;
}): Promise<{ success: boolean; data?: Partial<Person>; error?: string }> {
  const res = await apiRequest('/persons', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      phone: data.phone || '',
      role: data.role || 'visitor',
      is_active: true,
    }),
  });
  if (res.code === 0) {
    return { success: true, data: res.data };
  }
  return { success: false, error: res.msg };
}

export async function updatePerson(
  id: number,
  data: Partial<Person>
): Promise<{ success: boolean; data?: Partial<Person>; error?: string }> {
  const body: any = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.role !== undefined) body.role = data.role;
  if (data.status !== undefined) body.is_active = data.status;

  const res = await apiRequest('/persons/' + id, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (res.code === 0) {
    return { success: true, data: res.data };
  }
  return { success: false, error: res.msg };
}

export async function deletePerson(id: number): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest('/persons/' + id, { method: 'DELETE' });
  if (res.code === 0) {
    return { success: true };
  }
  return { success: false, error: res.msg };
}

// ==================== Face API ====================

export async function getFaceLibrary(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const res = await apiRequest<any[]>('/face/library');
  if (res.code === 0) {
    return { success: true, data: res.data };
  }
  return { success: false, error: res.msg };
}

export async function enrollFace(
  personId: number,
  imageFile: File
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`/api/face/enroll?person_id=${personId}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.code === 0) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.msg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface FaceVerifyResult {
  pass: boolean;
  score: number;
  person?: { id: number; name: string };
  snapshot_url?: string;
  notified?: boolean;
}

export async function verifyFace(imageFile: File): Promise<{ success: boolean; data?: FaceVerifyResult; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch('/api/face/verify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.code === 0) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.msg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFace(id: number): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest('/face/' + id, { method: 'DELETE' });
  if (res.code === 0) {
    return { success: true };
  }
  return { success: false, error: res.msg };
}

// ==================== Detection API ====================

export interface DetectionResult {
  cls: string;
  conf: number;
  bbox: number[];
}

export interface DetectionRecord {
  id: number;
  image_url: string;
  annotated_url: string;
  detections: DetectionResult[];
  ts: string;
}

export async function detectObjects(
  imageFile: File,
  linkage: boolean = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    if (linkage) formData.append('linkage', '1');

    const response = await fetch('/api/detect', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.code === 0) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.msg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDetections(params?: {
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data?: DetectionRecord[]; pagination?: any; error?: string }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  searchParams.set('size', String(params?.limit || 6));

  const query = searchParams.toString();
  const res = await apiRequest<{ total: number; items: any[] }>('/detections' + (query ? '?' + query : ''));
  if (res.code === 0 && res.data) {
    const apiBase = (import.meta.env.VITE_API_BASE || '');
    const items = (res.data.items || []).map((item: any) => ({
      ...item,
      originalImage: apiBase + item.image_url,
      annotatedImage: apiBase + item.annotated_url,
      results: (item.detections || []).map((d: any) => ({
        category: d.cls,
        category_zh: d.cls,
        confidence: d.conf,
        bbox: d.bbox,
      })),
    }));
    return {
      success: true,
      data: items,
      pagination: { total: res.data.total, page: params?.page || 1, limit: params?.limit || 6 },
    };
  }
  return { success: false, error: res.msg };
}

// ==================== Logs API ====================

export interface SystemLog {
  id: number;
  timestamp: string;
  action: string;
  target: string;
  operator: string;
  details: string;
}

export async function getLogs(params?: {
  action?: string;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data?: SystemLog[]; pagination?: any; error?: string }> {
  const searchParams = new URLSearchParams();
  if (params?.action) searchParams.set('action', params.action);
  if (params?.date) searchParams.set('start', params.date);
  if (params?.page) searchParams.set('page', String(params.page));
  searchParams.set('size', String(params?.limit || 20));

  const query = searchParams.toString();
  const res = await apiRequest<{ total: number; items: any[] }>('/logs' + (query ? '?' + query : ''));
  if (res.code === 0 && res.data) {
    const items = res.data.items.map((log: any) => ({
      id: log.id,
      timestamp: log.ts,
      action: log.action,
      target: log.target,
      operator: log.operator,
      details: typeof log.detail === 'string' ? log.detail : JSON.stringify(log.detail || {}),
    }));
    return {
      success: true,
      data: items,
      pagination: { total: res.data.total, page: params?.page || 1, limit: params?.limit || 20 },
    };
  }
  return { success: false, error: res.msg };
}

// ==================== Health Check ====================

export async function healthCheck(): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest('/health');
  return { success: res.code === 0, error: res.msg };
}

// ==================== Camera API ====================

export async function captureFromBackend(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch('/api/camera/capture', { method: 'POST' });
    const data = await response.json();
    if (data.code === 0 && data.data?.image) {
      return { success: true, data: data.data.image };
    }
    return { success: false, error: data.msg || '拍照失败' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
