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

interface DashboardProps {
  devices: DeviceState;
  onDeviceCommand: (deviceId: string, command: any) => void;
  onOpenLightbox: (imageUrl: string, title: string) => void;
  onNavigate: (view: string) => void;
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Dashboard({
  devices,
  onDeviceCommand,
  onOpenLightbox,
  onNavigate,
  toast,
}: DashboardProps) {
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
      try {
        const res = await fetch("/api/sensors/latest");
        const json = await res.json();
        if (json.success) {
          setLatestSensor(json.data);
          
          // Trigger critical temp alarm if >30
          if (json.data.temperature > 30) {
            // just local visual trigger
          }
        }
      } catch (err) {
        console.error("Error polling sensors:", err);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch sensor history for chart, event stream logs, and recent YOLO detection
  const fetchDashboardData = async () => {
    try {
      // Sensor history
      const histRes = await fetch("/api/sensors/history");
      const histJson = await histRes.json();
      if (histJson.success) {
        setHistoryData(histJson.data);
      }

      // Recent 5 logs
      const logRes = await fetch("/api/logs?limit=5");
      const logJson = await logRes.json();
      if (logJson.success) {
        setRecentLogs(logJson.data);
      }

      // Recent detection
      const detRes = await fetch("/api/detections");
      const detJson = await detRes.json();
      if (detJson.success && detJson.data.length > 0) {
        setRecentDetection(detJson.data[0]);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
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
    const nextPower = !devices[id].power;
    onDeviceCommand(id, { power: nextPower });
    toast(`${id === "livingRoomLight" ? "客厅灯" : id === "bedroomLight" ? "卧室灯" : "厨房灯"} 已${nextPower ? "开启" : "关闭"}`, "success");
  };

  const handleBrightnessChange = (
    id: "livingRoomLight" | "bedroomLight" | "kitchenLight",
    val: number
  ) => {
    onDeviceCommand(id, { brightness: val });
  };

  const handleToggleAc = () => {
    const nextPower = !devices.ac.power;
    onDeviceCommand("ac", { power: nextPower });
    toast(`空调已${nextPower ? "开启" : "关闭"}`, "success");
  };

  const handleAcTemp = (change: number) => {
    const nextTemp = devices.ac.temperature + change;
    if (nextTemp >= 16 && nextTemp <= 30) {
      onDeviceCommand("ac", { temperature: nextTemp });
    }
  };

  const handleToggleFan = () => {
    const nextPower = !devices.fan.power;
    onDeviceCommand("fan", { power: nextPower, autoMode: false }); // turn off auto mode when manual click
    toast(`风扇已${nextPower ? "开启" : "关闭"} (智能控温已关闭)`, "info");
  };

  const handleToggleFanAuto = () => {
    const nextAuto = !devices.fan.autoMode;
    onDeviceCommand("fan", { autoMode: nextAuto });
    toast(`风扇智能控温已${nextAuto ? "启用" : "禁用"}`, "success");
  };

  const handleToggleDoorLock = () => {
    const nextLocked = !devices.door.locked;
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
        return "bg-emerald-950/80 text-emerald-400 border-emerald-800/50";
      case "gate_reject":
        return "bg-rose-950/80 text-rose-400 border-rose-800/50";
      case "fan_auto":
        return "bg-cyan-950/80 text-cyan-400 border-cyan-800/50";
      case "scene_change":
        return "bg-blue-950/80 text-blue-400 border-blue-800/50";
      case "device_control":
        return "bg-amber-950/80 text-amber-400 border-amber-800/50";
      default:
        return "bg-zinc-900 text-zinc-400 border-zinc-800";
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
            className={`p-5 rounded-2xl border transition duration-300 ${
              isTempCritical
                ? "bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-950/20"
                : "bg-zinc-900/60 border-zinc-800/80 text-zinc-100"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 font-medium tracking-wide">室内温度</span>
              <Thermometer
                className={`w-5 h-5 ${isTempCritical ? "text-rose-400 animate-pulse" : "text-amber-400"}`}
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-semibold">{latestSensor.temperature}</span>
              <span className="text-sm font-sans text-zinc-400">°C</span>
            </div>
            {isTempCritical && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>温度过高警告 ({latestSensor.temperature}°C)</span>
              </div>
            )}
            {!isTempCritical && (
              <span className="text-[10px] text-zinc-500 block mt-2">智能风扇阈值: 26.0°C</span>
            )}
          </div>

          {/* Humidity */}
          <div
            id="sensor-humidity-card"
            className="p-5 rounded-2xl border bg-zinc-900/60 border-zinc-800/80 text-zinc-100 transition duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 font-medium tracking-wide">空气湿度</span>
              <Droplets className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-semibold">{latestSensor.humidity}</span>
              <span className="text-sm font-sans text-zinc-400">%</span>
            </div>
            <span className="text-[10px] text-zinc-500 block mt-2">适宜湿度: 40% - 60%</span>
          </div>
        </div>

        {/* Device Control Card */}
        <div id="device-controls-card" className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 className="font-sans font-medium text-sm text-zinc-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-400" />
              智能设备控制
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Live Controllers</span>
          </div>

          {/* Lights Controls */}
          <div className="space-y-4">
            <div className="text-xs text-zinc-500 font-medium">灯光系统 (滑动调节亮度)</div>
            
            {/* Living Room Light */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Lightbulb className={`w-4 h-4 ${devices.livingRoomLight.power ? "text-amber-400" : "text-zinc-600"}`} />
                  客厅主灯
                </span>
                <button
                  onClick={() => handleToggleLight("livingRoomLight")}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    devices.livingRoomLight.power ? "bg-amber-500" : "bg-zinc-800"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    devices.livingRoomLight.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
              {devices.livingRoomLight.power && (
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={devices.livingRoomLight.brightness}
                  onChange={(e) => handleBrightnessChange("livingRoomLight", parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              )}
            </div>

            {/* Bedroom Light */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Lightbulb className={`w-4 h-4 ${devices.bedroomLight.power ? "text-amber-400" : "text-zinc-600"}`} />
                  卧室壁灯
                </span>
                <button
                  onClick={() => handleToggleLight("bedroomLight")}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    devices.bedroomLight.power ? "bg-amber-500" : "bg-zinc-800"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    devices.bedroomLight.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
              {devices.bedroomLight.power && (
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={devices.bedroomLight.brightness}
                  onChange={(e) => handleBrightnessChange("bedroomLight", parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              )}
            </div>

            {/* Kitchen Light */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Lightbulb className={`w-4 h-4 ${devices.kitchenLight.power ? "text-amber-400" : "text-zinc-600"}`} />
                  厨房射灯
                </span>
                <button
                  onClick={() => handleToggleLight("kitchenLight")}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    devices.kitchenLight.power ? "bg-amber-500" : "bg-zinc-800"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    devices.kitchenLight.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
              {devices.kitchenLight.power && (
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={devices.kitchenLight.brightness}
                  onChange={(e) => handleBrightnessChange("kitchenLight", parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              )}
            </div>
          </div>

          {/* AC Controls */}
          <div className="border-t border-zinc-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Wind className={`w-4 h-4 ${devices.ac.power ? "text-indigo-400 animate-pulse" : "text-zinc-600"}`} />
                智能冷暖空调
              </span>
              <button
                onClick={handleToggleAc}
                className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                  devices.ac.power ? "bg-indigo-600" : "bg-zinc-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                  devices.ac.power ? "translate-x-4" : ""
                }`} />
              </button>
            </div>
            {devices.ac.power && (
              <div className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
                <button
                  onClick={() => handleAcTemp(-1)}
                  className="w-8 h-8 rounded-lg bg-zinc-850 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 transition text-sm font-semibold"
                >
                  -
                </button>
                <div className="text-center">
                  <div className="text-xs text-zinc-500">设定温度</div>
                  <div className="text-sm font-mono font-semibold text-zinc-200">{devices.ac.temperature} °C</div>
                </div>
                <button
                  onClick={() => handleAcTemp(1)}
                  className="w-8 h-8 rounded-lg bg-zinc-850 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 transition text-sm font-semibold"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Fan Controls */}
          <div className="border-t border-zinc-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Fan className={`w-4 h-4 ${devices.fan.power ? "text-cyan-400 animate-spin" : "text-zinc-600"}`} style={{ animationDuration: "1.5s" }} />
                直流变频风扇
              </span>
              <div className="flex items-center gap-3">
                {/* Auto Mode Switch */}
                <button
                  onClick={handleToggleFanAuto}
                  className={`px-2 py-1 text-[9px] font-medium border rounded-md transition ${
                    devices.fan.autoMode
                      ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400"
                      : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  智能控温
                </button>
                {/* Toggle switch */}
                <button
                  onClick={handleToggleFan}
                  className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                    devices.fan.power ? "bg-cyan-600" : "bg-zinc-800"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                    devices.fan.power ? "translate-x-4" : ""
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Door Controls */}
          <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Compass className={`w-4 h-4 ${devices.door.locked ? "text-emerald-500" : "text-rose-400"}`} />
              入户防盗门锁
            </span>
            <button
              onClick={handleToggleDoorLock}
              className={`px-3 py-1.5 text-xs font-medium border rounded-xl transition ${
                devices.door.locked
                  ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/50"
                  : "bg-rose-950/30 border-rose-500/20 text-rose-400 hover:bg-rose-950/50"
              }`}
            >
              {devices.door.locked ? "已加锁" : "已解锁"}
            </button>
          </div>

        </div>

      </div>

      {/* COLUMN 2: Apartment Plan Visualizer (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div id="apartment-plan-card" className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
            <h3 className="font-sans font-medium text-sm text-zinc-200">
              户型总览与设备联动
            </h3>
            <span className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${devices.door.locked ? "bg-emerald-500" : "bg-rose-500"}`} />
              门锁状态: {devices.door.locked ? "安全" : "释放"}
            </span>
          </div>

          {/* SVG Floorplan Container */}
          <div className="relative aspect-[4/3] bg-zinc-950 border border-zinc-800/60 rounded-xl overflow-hidden p-4 flex items-center justify-center">
            
            {/* SVG Interactive Elements */}
            <svg viewBox="0 0 500 380" className="w-full h-full select-none text-zinc-400 font-sans">
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
              <rect x="20" y="20" width="220" height="220" rx="4" fill="#0f0f11" stroke="#27272a" strokeWidth="2" />
              {/* Bedroom */}
              <rect x="260" y="20" width="220" height="180" rx="4" fill="#0f0f11" stroke="#27272a" strokeWidth="2" />
              {/* Kitchen */}
              <rect x="260" y="210" width="220" height="150" rx="4" fill="#0f0f11" stroke="#27272a" strokeWidth="2" />
              {/* Garden/Entrance area below */}
              <rect x="20" y="250" width="220" height="110" rx="4" fill="#0c0a09" stroke="#1c1917" strokeWidth="1" strokeDasharray="4 2" />

              {/* Light glow visualizations */}
              {devices.livingRoomLight.power && (
                <circle cx="130" cy="130" r={60 + (devices.livingRoomLight.brightness * 0.4)} fill="url(#glow-lr)" />
              )}
              {devices.bedroomLight.power && (
                <circle cx="370" cy="110" r={40 + (devices.bedroomLight.brightness * 0.4)} fill="url(#glow-br)" />
              )}
              {devices.kitchenLight.power && (
                <circle cx="370" cy="285" r={40 + (devices.kitchenLight.brightness * 0.4)} fill="url(#glow-kt)" />
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
              <text x="130" y="285" textAnchor="middle" fill="#57534e" fontSize="11" fontWeight="500">
                入户前廊 (Garden Gate)
              </text>

              {/* Door Visual Symbolizer */}
              <g transform="translate(110, 235)">
                {/* Door Frame */}
                <line x1="0" y1="5" x2="40" y2="5" stroke="#3f3f46" strokeWidth="3" />
                {/* Door Swing Path */}
                {devices.door.open ? (
                  <>
                    <path d="M 40,5 A 40,40 0 0,1 0,45" fill="none" stroke="#e11d48" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="5" x2="40" y2="45" stroke="#e11d48" strokeWidth="3" />
                  </>
                ) : (
                  <>
                    <path d="M 40,5 A 40,40 0 0,1 0,5" fill="none" stroke="#27272a" strokeWidth="1" />
                    <line x1="40" y1="5" x2="0" y2="5" stroke="#10b981" strokeWidth="4" />
                  </>
                )}
                <circle cx="20" cy="5" r="3" fill={devices.door.locked ? "#10b981" : "#e11d48"} />
              </g>

              {/* AC Cooling wind effect */}
              {devices.ac.power && (
                <g transform="translate(320, 140)">
                  <path d="M10,0 Q30,10 50,0 T90,0" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.6" className="animate-pulse" />
                  <path d="M10,12 Q30,22 50,12 T90,12" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.4" className="animate-pulse" />
                  <text x="50" y="-10" textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="600">
                    AC {devices.ac.temperature}°C
                  </text>
                </g>
              )}

              {/* Fan Spinning animation indicator */}
              {devices.fan.power && (
                <g transform="translate(130, 130)">
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 2" />
                  <path d="M-10,-10 L10,10 M-10,10 L10,-10" stroke="#22d3ee" strokeWidth="2" strokeOpacity="0.7" />
                </g>
              )}
            </svg>

            {/* Float visual cues */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                devices.door.open 
                  ? "bg-rose-950/80 border-rose-500/30 text-rose-300" 
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
              }`}>
                前门: {devices.door.open ? "大开" : "关闭"}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                devices.fan.power 
                  ? "bg-cyan-950/80 border-cyan-500/30 text-cyan-300" 
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
              }`}>
                风扇: {devices.fan.power ? "工作中" : "关闭"}
              </span>
            </div>
          </div>

          {/* 24h Sensor Trend lines */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                24小时温湿度变化趋势
              </div>
              
              {/* Dynamic Legend checkboxes */}
              <div className="flex items-center gap-3 text-[10px]">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTemp}
                    onChange={() => setShowTemp(!showTemp)}
                    className="rounded border-zinc-700 text-indigo-600 focus:ring-0 bg-zinc-900"
                  />
                  <span className="text-amber-400 font-medium">温度</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showHum}
                    onChange={() => setShowHum(!showHum)}
                    className="rounded border-zinc-700 text-indigo-600 focus:ring-0 bg-zinc-900"
                  />
                  <span className="text-indigo-400 font-medium">湿度</span>
                </label>
              </div>
            </div>

            {/* Recharts trend */}
            <div className="h-44 w-full bg-zinc-950/30 rounded-xl border border-zinc-850 p-2">
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatHour}
                      stroke="#52525b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                      labelStyle={{ color: "#a1a1aa", fontSize: "10px" }}
                      itemStyle={{ fontSize: "11px" }}
                      labelFormatter={(label) => new Date(label).toLocaleString("zh-CN")}
                    />
                    {showTemp && (
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        name="温度 (°C)"
                        stroke="#fbbf24"
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
                <div className="flex items-center justify-center h-full text-xs text-zinc-500 font-mono">
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
        <div id="event-stream-card" className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <h3 className="font-sans font-medium text-sm text-zinc-200">
              实时事件流
            </h3>
            <button
              onClick={() => onNavigate("Logs")}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
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
                <div key={log.id} className="border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${getLogBadgeColor(log.action)}`}>
                      {getLogActionZh(log.action)}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">{formatHour(log.timestamp)}</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-300 mb-0.5">{log.target}</div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1 flex-wrap">
                    <span>由 {log.operator} 触发</span>
                    {log.action === "device_control" && (
                      <span className="text-zinc-400 bg-zinc-850 px-1 rounded font-mono">
                        {log.details}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {recentLogs.length === 0 && (
              <div className="text-center py-6 text-zinc-500 text-xs">暂无最新事件</div>
            )}
          </div>
        </div>

        {/* YOLO Vision Recent Detection Thumbnail */}
        <div id="yolo-thumbnail-card" className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <h3 className="font-sans font-medium text-sm text-zinc-200 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-400" />
              最近视觉识别
            </h3>
            <button
              onClick={() => onNavigate("DetectObjects")}
              className="text-[10px] text-indigo-400 hover:text-indigo-300"
            >
              去检测
            </button>
          </div>

          {recentDetection ? (
            <div className="space-y-3">
              <div
                onClick={() => onOpenLightbox(recentDetection.originalImage, "最近识别原图")}
                className="relative aspect-video rounded-xl bg-zinc-950 overflow-hidden border border-zinc-850 cursor-pointer group"
              >
                <img
                  src={recentDetection.originalImage}
                  alt="Recent object detection"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                  <span className="text-xs text-zinc-300 font-medium">点击放大查看</span>
                </div>
                {/* Detected Badges counts */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-600/90 text-white shadow">
                    检出: {recentDetection.results.length}
                  </span>
                </div>
              </div>

              {/* Mini detection items list */}
              <div className="space-y-1.5">
                {recentDetection.results.slice(0, 3).map((res, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-zinc-950/40 px-2 py-1.5 rounded-lg border border-zinc-850">
                    <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {res.category_zh} ({res.category})
                    </span>
                    <span className="font-mono text-zinc-400">{Math.round(res.confidence * 100)}% 相似度</span>
                  </div>
                ))}
                {recentDetection.results.length > 3 && (
                  <div className="text-[10px] text-zinc-500 text-center font-medium italic">
                    以及其他 {recentDetection.results.length - 3} 个目标...
                  </div>
                )}
              </div>

              <div className="text-[9.5px] font-mono text-zinc-500 text-right">
                检测于: {new Date(recentDetection.timestamp).toLocaleString("zh-CN")}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
              暂无任何 YOLO 视觉检测记录，请进入「物体识别」页面进行检测。
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
