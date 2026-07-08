import React, { useState, useEffect } from "react";
import {
  Thermometer,
  Droplets,
  Lightbulb,
  Fan,
  Wind,
  Compass,
  CheckCircle,
  AlertTriangle,
  History,
  TrendingUp,
  Sliders,
  ChevronRight,
  Eye,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DeviceState, SensorReading, SystemLog, Detection } from "../types";
import * as api from "../api";

interface DashboardProps {
  devices: DeviceState;
  onDeviceCommand: (deviceId: string, command: any) => void;
  onOpenLightbox: (imageUrl: string, title: string) => void;
  onNavigate: (view: string) => void;
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

const defaultDevices: DeviceState = {
  livingRoomLight: { power: false, brightness: 50 },
  bedroomLight: { power: false, brightness: 50 },
  kitchenLight: { power: false, brightness: 50 },
  ac: { power: false, temperature: 26 },
  fan: { power: false, autoMode: true },
  door: { locked: true, open: false },
  window: { open: false },
};

export default function Dashboard({
  devices,
  onDeviceCommand,
  onOpenLightbox,
  onNavigate,
  toast,
}: DashboardProps) {
  // Local state for optimistic UI updates (instant feedback before server response)
  const [localDevices, setLocalDevices] = useState<DeviceState>({ ...defaultDevices, ...devices });
  const safeDevices: DeviceState = localDevices;

  // Sync local state when prop changes (only if local state is stale)
  useEffect(() => {
    const syncedState = { ...defaultDevices, ...devices };
    // Only sync if state differs (user hasn't made changes)
    if (
      localDevices.livingRoomLight.power !== syncedState.livingRoomLight.power ||
      localDevices.bedroomLight.power !== syncedState.bedroomLight.power ||
      localDevices.kitchenLight.power !== syncedState.kitchenLight.power ||
      localDevices.livingRoomLight.brightness !== syncedState.livingRoomLight.brightness ||
      localDevices.bedroomLight.brightness !== syncedState.bedroomLight.brightness ||
      localDevices.kitchenLight.brightness !== syncedState.kitchenLight.brightness ||
      localDevices.ac.power !== syncedState.ac.power ||
      localDevices.ac.temperature !== syncedState.ac.temperature ||
      localDevices.fan.power !== syncedState.fan.power ||
      localDevices.fan.autoMode !== syncedState.fan.autoMode ||
      localDevices.door.locked !== syncedState.door.locked
    ) {
      setLocalDevices(syncedState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]); // Only depend on devices prop
  const [latestSensor, setLatestSensor] = useState<{
    temperature: number;
    humidity: number;
    timestamp: string;
  }>({ temperature: 24.5, humidity: 55.0, timestamp: new Date().toISOString() });

  const [historyData, setHistoryData] = useState<SensorReading[]>([]);
  const [recentLogs, setRecentLogs] = useState<SystemLog[]>([]);
  const [recentDetection, setRecentDetection] = useState<Detection | null>(null);

  // Toggle chart series visibility
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);

  // 1. Poll latest sensor data every 3 seconds
  useEffect(() => {
    const fetchLatest = async () => {
      const res = await api.getLatestSensor();
      if (res.success && res.data) {
        setLatestSensor(res.data);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch sensor history for chart, event stream logs, and recent YOLO detection
  const fetchDashboardData = async () => {
    // Sensor history
    const histRes = await api.getSensorHistory();
    if (histRes.success && histRes.data) {
      setHistoryData(histRes.data);
    }

    // Recent 5 logs
    const logRes = await api.getLogs({ limit: 5 });
    if (logRes.success && logRes.data) {
      setRecentLogs(logRes.data);
    }

    // Recent detection
    const detRes = await api.getDetections({ limit: 1 });
    if (detRes.success && detRes.data && detRes.data.length > 0) {
      setRecentDetection(detRes.data[0]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh static data every 10 seconds to keep charts and logs relatively up to date
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Device command proxies
  const handleToggleLight = (id: "livingRoomLight" | "bedroomLight" | "kitchenLight") => {
    const nextPower = !safeDevices[id].power;
    // Optimistic UI update
    setLocalDevices(prev => prev ? { ...prev, [id]: { ...prev[id], power: nextPower } } : { ...defaultDevices, [id]: { ...defaultDevices[id], power: nextPower } });
    onDeviceCommand(id, { power: nextPower });
    toast(`${id === "livingRoomLight" ? "客厅灯" : id === "bedroomLight" ? "卧室灯" : "厨房灯"} 已${nextPower ? "开启" : "关闭"}`, "success");
  };

  const handleBrightnessChange = (
    id: "livingRoomLight" | "bedroomLight" | "kitchenLight",
    val: number
  ) => {
    setLocalDevices(prev => prev ? { ...prev, [id]: { ...prev[id], brightness: val } } : { ...defaultDevices, [id]: { ...defaultDevices[id], brightness: val } });
    onDeviceCommand(id, { brightness: val });
  };

  const handleToggleAc = () => {
    const nextPower = !safeDevices.ac.power;
    setLocalDevices(prev => prev ? { ...prev, ac: { ...prev.ac, power: nextPower } } : { ...defaultDevices, ac: { ...defaultDevices.ac, power: nextPower } });
    onDeviceCommand("ac", { power: nextPower });
    toast(`空调已${nextPower ? "开启" : "关闭"}`, "success");
  };

  const handleAcTemp = (change: number) => {
    const nextTemp = safeDevices.ac.temperature + change;
    if (nextTemp >= 16 && nextTemp <= 30) {
      setLocalDevices(prev => prev ? { ...prev, ac: { ...prev.ac, temperature: nextTemp } } : { ...defaultDevices, ac: { ...defaultDevices.ac, temperature: nextTemp } });
      onDeviceCommand("ac", { temperature: nextTemp });
    }
  };

  const handleToggleFan = () => {
    const nextPower = !safeDevices.fan.power;
    setLocalDevices(prev => prev ? { ...prev, fan: { ...prev.fan, power: nextPower, autoMode: false } } : { ...defaultDevices, fan: { ...defaultDevices.fan, power: nextPower, autoMode: false } });
    onDeviceCommand("fan", { power: nextPower, autoMode: false }); // turn off auto mode when manual click
    toast(`风扇已${nextPower ? "开启" : "关闭"} (智能控温已关闭)`, "info");
  };

  const handleToggleFanAuto = () => {
    const nextAuto = !safeDevices.fan.autoMode;
    setLocalDevices(prev => prev ? { ...prev, fan: { ...prev.fan, autoMode: nextAuto } } : { ...defaultDevices, fan: { ...defaultDevices.fan, autoMode: nextAuto } });
    onDeviceCommand("fan", { autoMode: nextAuto });
    toast(`风扇智能控温已${nextAuto ? "启用" : "禁用"}`, "success");
  };

  const handleToggleDoorLock = () => {
    const nextLocked = !safeDevices.door.locked;
    setLocalDevices(prev => prev ? { ...prev, door: { ...prev.door, locked: nextLocked } } : { ...defaultDevices, door: { ...defaultDevices.door, locked: nextLocked } });
    onDeviceCommand("door", { locked: nextLocked, open: false });
    toast(nextLocked ? "门锁已锁定" : "门锁已解锁", "success");
  };

  // Helper for formatting time
  const formatHour = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const getLogBadgeColor = (action: string) => {
    switch (action) {
      case "open_door_pass":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "gate_reject":
        return "bg-rose-100 text-rose-700 border-rose-300";
      case "fan_auto":
        return "bg-cyan-100 text-cyan-700 border-cyan-300";
      case "scene_change":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "device_control":
        return "bg-amber-100 text-amber-700 border-amber-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  const getLogActionZh = (action: string) => {
    switch (action) {
      case "open_door_pass":
        return "开门通过";
      case "gate_reject":
        return "门禁拒绝";
      case "fan_auto":
        return "风扇自启";
      case "scene_change":
        return "场景切换";
      case "device_control":
        return "设备控制";
      default:
        return "未知操作";
    }
  };

  const isTempCritical = latestSensor.temperature > 30;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* COLUMN 1: Sensors & Device Controls (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Real-time Sensor Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div
            id="sensor-temp-card"
            className={`p-5 rounded-2xl border transition duration-300 shadow-sm ${
              isTempCritical
                ? "bg-rose-50 border-rose-300 text-rose-800 shadow-lg shadow-rose-100"
                : "bg-white border-gray-200 text-gray-800"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium tracking-wide">室内温度</span>
              <Thermometer
                className={`w-5 h-5 ${isTempCritical ? "text-rose-500 animate-pulse" : "text-amber-500"}`}
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-semibold">{latestSensor.temperature}</span>
              <span className="text-sm font-sans text-gray-500">°C</span>
            </div>
            {isTempCritical && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>温度过高警告 ({latestSensor.temperature}°C)</span>
              </div>
            )}
            {!isTempCritical && (
              <span className="text-[10px] text-gray-400 block mt-2">智能风扇阈值: 26.0°C</span>
            )}
          </div>

          {/* Humidity */}
          <div
            id="sensor-humidity-card"
            className="p-5 rounded-2xl border bg-white border-gray-200 text-gray-800 transition duration-300 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium tracking-wide">空气湿度</span>
              <Droplets className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-semibold">{latestSensor.humidity}</span>
              <span className="text-sm font-sans text-gray-500">%</span>
            </div>
            <span className="text-[10px] text-gray-400 block mt-2">适宜湿度: 40% - 60%</span>
          </div>
        </div>

        {/* Device Control Card */}
        <div id="device-controls-card" className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-sans font-medium text-sm text-gray-700 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-gray-400" />
              智能设备控制
            </h3>
            <span className="text-[10px] font-mono text-gray-400 uppercase">Live Controllers</span>
          </div>

          {/* Lights Controls */}
          <div className="space-y-4">
            <div className="text-xs text-gray-500 font-medium">灯光系统 (滑动调节亮度)</div>
            
            {/* Living Room Light */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Lightbulb className={`w-4 h-4 ${safeDevices.livingRoomLight.power ? "text-amber-500" : "text-gray-300"}`} />
                  客厅主灯
                </span>
                <button
                  onClick={() => handleToggleLight("livingRoomLight")}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    safeDevices.livingRoomLight.power ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    safeDevices.livingRoomLight.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
              {safeDevices.livingRoomLight.power && (
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={safeDevices.livingRoomLight.brightness}
                  onChange={(e) => handleBrightnessChange("livingRoomLight", parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              )}
            </div>

            {/* Bedroom Light */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Lightbulb className={`w-4 h-4 ${safeDevices.bedroomLight.power ? "text-amber-500" : "text-gray-300"}`} />
                  卧室壁灯
                </span>
                <button
                  onClick={() => handleToggleLight("bedroomLight")}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    safeDevices.bedroomLight.power ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    safeDevices.bedroomLight.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
              {safeDevices.bedroomLight.power && (
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={safeDevices.bedroomLight.brightness}
                  onChange={(e) => handleBrightnessChange("bedroomLight", parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              )}
            </div>

            {/* Kitchen Light */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Lightbulb className={`w-4 h-4 ${safeDevices.kitchenLight.power ? "text-amber-500" : "text-gray-300"}`} />
                  厨房射灯
                </span>
                <button
                  onClick={() => handleToggleLight("kitchenLight")}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    safeDevices.kitchenLight.power ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    safeDevices.kitchenLight.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
              {safeDevices.kitchenLight.power && (
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={safeDevices.kitchenLight.brightness}
                  onChange={(e) => handleBrightnessChange("kitchenLight", parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              )}
            </div>
          </div>

          {/* AC Controls */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Wind className={`w-4 h-4 ${safeDevices.ac.power ? "text-indigo-500 animate-pulse" : "text-gray-300"}`} />
                智能冷暖空调
              </span>
              <button
                onClick={handleToggleAc}
                className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                  safeDevices.ac.power ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                  safeDevices.ac.power ? "translate-x-4" : ""
                }`} />
              </button>
            </div>
            {safeDevices.ac.power && (
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <button
                  onClick={() => handleAcTemp(-1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 transition text-sm font-semibold"
                >
                  -
                </button>
                <div className="text-center">
                  <div className="text-xs text-gray-500">设定温度</div>
                  <div className="text-sm font-mono font-semibold text-gray-700">{safeDevices.ac.temperature} °C</div>
                </div>
                <button
                  onClick={() => handleAcTemp(1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 transition text-sm font-semibold"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Fan Controls */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1.5">
                <Fan className={`w-4 h-4 ${safeDevices.fan.power ? "text-cyan-500 animate-spin" : "text-gray-300"}`} style={{ animationDuration: "1.5s" }} />
                直流变频风扇
              </span>
              <div className="flex items-center gap-3">
                {/* Auto Mode Switch */}
                <button
                  onClick={handleToggleFanAuto}
                  className={`px-2 py-1 text-[9px] font-medium border rounded-md transition ${
                    safeDevices.fan.autoMode
                      ? "bg-cyan-100 border-cyan-300 text-cyan-700"
                      : "bg-transparent border-gray-200 text-gray-500 hover:text-gray-600"
                  }`}
                >
                  智能控温
                </button>
                {/* Toggle switch */}
                <button
                  onClick={handleToggleFan}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    safeDevices.fan.power ? "bg-cyan-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    safeDevices.fan.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Door Controls */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1.5">
              <Compass className={`w-4 h-4 ${safeDevices.door.locked ? "text-emerald-600" : "text-rose-500"}`} />
              入户防盗门锁
            </span>
            <button
              onClick={handleToggleDoorLock}
              className={`px-3 py-1.5 text-xs font-medium border rounded-xl transition ${
                safeDevices.door.locked
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
              }`}
            >
              {safeDevices.door.locked ? "已加锁" : "已解锁"}
            </button>
          </div>

        </div>

      </div>

      {/* COLUMN 2: Apartment Plan Visualizer (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div id="apartment-plan-card" className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <h3 className="font-sans font-medium text-sm text-gray-700">
              户型总览与设备联动
            </h3>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${safeDevices.door.locked ? "bg-emerald-500" : "bg-rose-500"}`} />
              门锁状态: {safeDevices.door.locked ? "安全" : "释放"}
            </span>
          </div>

          {/* SVG Floorplan Container */}
          <div className="relative aspect-[4/3] bg-gray-50 border border-gray-200 rounded-xl overflow-hidden p-4 flex items-center justify-center">
            
            {/* SVG Interactive Elements */}
            <svg viewBox="0 0 500 380" className="w-full h-full select-none text-gray-400 font-sans">
              <defs>
                {/* Glow effects for active lights */}
                <radialGradient id="glow-lr" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="glow-br" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="glow-kt" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Main Walls/Rooms outer lines */}
              {/* Living Room */}
              <rect x="20" y="20" width="220" height="220" rx="4" fill="#fafafa" stroke="#d4d4d8" strokeWidth="2" />
              {/* Bedroom */}
              <rect x="260" y="20" width="220" height="180" rx="4" fill="#fafafa" stroke="#d4d4d8" strokeWidth="2" />
              {/* Kitchen */}
              <rect x="260" y="210" width="220" height="150" rx="4" fill="#fafafa" stroke="#d4d4d8" strokeWidth="2" />
              {/* Garden/Entrance area below */}
              <rect x="20" y="250" width="220" height="110" rx="4" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="1" strokeDasharray="4 2" />

              {/* Light glow visualizations */}
              {safeDevices.livingRoomLight.power && (
                <circle cx="130" cy="130" r={60 + (safeDevices.livingRoomLight.brightness * 0.4)} fill="url(#glow-lr)" />
              )}
              {safeDevices.bedroomLight.power && (
                <circle cx="370" cy="110" r={40 + (safeDevices.bedroomLight.brightness * 0.4)} fill="url(#glow-br)" />
              )}
              {safeDevices.kitchenLight.power && (
                <circle cx="370" cy="285" r={40 + (safeDevices.kitchenLight.brightness * 0.4)} fill="url(#glow-kt)" />
              )}

              {/* Room Text Labels */}
              <text x="130" y="55" textAnchor="middle" fill="#71717a" fontSize="12" fontWeight="600">
                客厅 (Living Room)
              </text>
              <text x="370" y="50" textAnchor="middle" fill="#71717a" fontSize="12" fontWeight="600">
                卧室 (Bedroom)
              </text>
              <text x="370" y="240" textAnchor="middle" fill="#71717a" fontSize="12" fontWeight="600">
                厨房 (Kitchen)
              </text>
              <text x="130" y="285" textAnchor="middle" fill="#78716c" fontSize="11" fontWeight="500">
                入户前廊 (Garden Gate)
              </text>

              {/* Door Visual Symbolizer */}
              <g
                transform="translate(110, 235)"
                onClick={handleToggleDoorLock}
                style={{ cursor: "pointer" }}
              >
                {/* Door Frame */}
                <line x1="0" y1="5" x2="40" y2="5" stroke="#a1a1aa" strokeWidth="3" />
                {/* Door Swing Path */}
                {safeDevices.door.open ? (
                  <>
                    <path d="M 40,5 A 40,40 0 0,1 0,45" fill="none" stroke="#e11d48" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="5" x2="40" y2="45" stroke="#e11d48" strokeWidth="3" />
                  </>
                ) : (
                  <>
                    <path d="M 40,5 A 40,40 0 0,1 0,5" fill="none" stroke="#d4d4d8" strokeWidth="1" />
                    <line x1="40" y1="5" x2="0" y2="5" stroke="#10b981" strokeWidth="4" />
                  </>
                )}
                <circle cx="20" cy="5" r="3" fill={safeDevices.door.locked ? "#10b981" : "#e11d48"} />
                {/* Click hint */}
                <text x="20" y="60" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="400">
                  点击切换
                </text>
              </g>

              {/* AC Cooling wind effect */}
              {safeDevices.ac.power && (
                <g transform="translate(320, 140)">
                  <path d="M10,0 Q30,10 50,0 T90,0" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.6" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                  <path d="M10,12 Q30,22 50,12 T90,12" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.4" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                  <text x="50" y="-10" textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="600">
                    AC {safeDevices.ac.temperature}°C
                  </text>
                </g>
              )}

              {/* Fan Spinning animation indicator */}
              {safeDevices.fan.power && (
                <g transform="translate(130, 130)">
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 2" />
                  <path d="M-10,-10 L10,10 M-10,10 L10,-10" stroke="#22d3ee" strokeWidth="2" strokeOpacity="0.7" />
                </g>
              )}
            </svg>

            {/* Float visual cues */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                safeDevices.door.open 
                  ? "bg-rose-100 border-rose-300 text-rose-700" 
                  : "bg-gray-100 border-gray-200 text-gray-600"
              }`}>
                前门: {safeDevices.door.open ? "大开" : "关闭"}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                safeDevices.fan.power 
                  ? "bg-cyan-100 border-cyan-300 text-cyan-700" 
                  : "bg-gray-100 border-gray-200 text-gray-600"
              }`}>
                风扇: {safeDevices.fan.power ? "工作中" : "关闭"}
              </span>
            </div>
          </div>

          {/* 24h Sensor Trend lines */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                24小时温湿度变化趋势
              </div>
              
              {/* Dynamic Legend checkboxes */}
              <div className="flex items-center gap-3 text-[10px]">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTemp}
                    onChange={() => setShowTemp(!showTemp)}
                    className="rounded border-gray-300 text-amber-500 focus:ring-0 bg-white"
                  />
                  <span className="text-amber-600 font-medium">温度</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showHum}
                    onChange={() => setShowHum(!showHum)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-0 bg-white"
                  />
                  <span className="text-indigo-600 font-medium">湿度</span>
                </label>
              </div>
            </div>

            {/* Recharts trend */}
            <div className="h-44 w-full bg-gray-50 rounded-xl border border-gray-200 p-2">
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatHour}
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5", borderRadius: "12px" }}
                      labelStyle={{ color: "#52525b", fontSize: "10px" }}
                      itemStyle={{ fontSize: "11px" }}
                      labelFormatter={(label) => new Date(label).toLocaleString("zh-CN")}
                    />
                    {showTemp && (
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        name="温度 (°C)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    )}
                    {showHum && (
                      <Line
                        type="monotone"
                        dataKey="humidity"
                        name="湿度 (%)"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400 font-mono">
                  Loading trend data...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* COLUMN 3: Live Events & YOLO Thumbnails (3 cols) */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Event Stream */}
        <div id="event-stream-card" className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 className="font-sans font-medium text-sm text-gray-700">
              实时事件流
            </h3>
            <button
              onClick={() => onNavigate("logs")}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              全部日志
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4 max-h-[18rem] overflow-y-auto pr-1">
            {recentLogs.map((log) => {
              let parsedDetails = {};
              try {
                parsedDetails = JSON.parse(log.details);
              } catch {}

              return (
                <div key={log.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${getLogBadgeColor(log.action)}`}>
                      {getLogActionZh(log.action)}
                    </span>
                    <span className="text-[9px] font-mono text-gray-400">{formatHour(log.timestamp)}</span>
                  </div>
                  <div className="text-xs font-medium text-gray-600 mb-0.5">{log.target}</div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                    <span>由 {log.operator} 触发</span>
                    {log.action === "device_control" && (
                      <span className="text-gray-500 bg-gray-100 px-1 rounded font-mono">
                        {log.details}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {recentLogs.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-xs">暂无最新事件</div>
            )}
          </div>
        </div>

        {/* YOLO Vision Recent Detection Thumbnail */}
        <div id="yolo-thumbnail-card" className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h3 className="font-sans font-medium text-sm text-gray-700 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-500" />
              最近视觉识别
            </h3>
            <button
              onClick={() => onNavigate("detect")}
              className="text-[10px] text-indigo-600 hover:text-indigo-700"
            >
              去检测
            </button>
          </div>

          {recentDetection ? (
            <div className="space-y-3">
              <div
                onClick={() => onOpenLightbox(recentDetection.originalImage, "最近识别原图")}
                className="relative aspect-video rounded-xl bg-gray-100 overflow-hidden border border-gray-200 cursor-pointer group"
              >
                <img
                  src={recentDetection.originalImage}
                  alt="Recent object detection"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                  <span className="text-xs text-white font-medium">点击放大查看</span>
                </div>
                {/* Detected Badges counts */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-600 text-white shadow">
                    检出: {recentDetection.results?.length || 0}
                  </span>
                </div>
              </div>

              {/* Mini detection items list */}
              <div className="space-y-1.5">
                {recentDetection.results?.slice(0, 3).map((res, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
                    <span className="text-gray-700 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {res.category_zh} ({res.category})
                    </span>
                    <span className="font-mono text-gray-500">{Math.round(res.confidence * 100)}% 相似度</span>
                  </div>
                ))}
                {recentDetection.results?.length > 3 && (
                  <div className="text-[10px] text-gray-400 text-center font-medium italic">
                    以及其他 {(recentDetection.results?.length || 0) - 3} 个目标...
                  </div>
                )}
              </div>

              <div className="text-[9.5px] font-mono text-gray-400 text-right">
                检测于: {new Date(recentDetection.timestamp).toLocaleString("zh-CN")}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs border border-dashed border-gray-300 rounded-xl">
              暂无任何 YOLO 视觉检测记录，请进入「物体识别」页面进行检测。
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
