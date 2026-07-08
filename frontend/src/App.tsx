import React, { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  LayoutDashboard,
  UserCheck,
  Eye,
  History as HistoryIcon,
  Users,
  FileText,
  Home,
  LogOut,
  Moon,
  Wifi,
  WifiOff,
  Clock,
  X,
  Sparkles,
} from "lucide-react";

import Dashboard from "./views/Dashboard";
import FaceAccess from "./views/FaceAccess";
import DetectObjects from "./views/DetectObjects";
import History from "./views/History";
import Persons from "./views/Persons";
import Logs from "./views/Logs";
import { DeviceState } from "./types";
import * as api from "./api";

// Navigation tabs definition
type ActiveView = "dashboard" | "face" | "detect" | "history" | "persons" | "logs";

interface ToastMsg {
  id: string;
  text: string;
  type: "success" | "error" | "info";
}

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveView>("dashboard");
  const [activeScene, setActiveScene] = useState<"home" | "away" | "sleep">("home");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Devices state and controller
  const [devices, setDevices] = useState<DeviceState>({
    livingRoomLight: { power: false, brightness: 50 },
    bedroomLight: { power: false, brightness: 50 },
    kitchenLight: { power: false, brightness: 50 },
    fan: { power: false, autoMode: true },
    door: { locked: true, open: false },
    window: { open: false },
  });

  // Server connection check
  const [isServerConnected, setIsServerConnected] = useState(true);

  // Global Toast State
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Lightbox Modal state
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; imageUrl: string; title: string }>({
    isOpen: false,
    imageUrl: "",
    title: "",
  });

  // Share a quick device refresh trigger across children if needed
  const [devicesRefreshTrigger, setDevicesRefreshTrigger] = useState(0);

  const triggerDevicesRefresh = () => {
    setDevicesRefreshTrigger((prev) => prev + 1);
  };

  // Toast dispatch helper
  const addToast = (text: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    
    // Auto remove after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Ticking local digital clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch device states
  const fetchDevices = async () => {
    const res = await api.getDevices();
    if (res.success && res.data && Array.isArray(res.data)) {
      // Transform backend format to frontend DeviceState
      const deviceState: DeviceState = {
        livingRoomLight: { power: false, brightness: 50 },
        bedroomLight: { power: false, brightness: 50 },
        kitchenLight: { power: false, brightness: 50 },
        fan: { power: false, autoMode: true },
        door: { locked: true, open: false },
        window: { open: false },
      };
      
      res.data.forEach((d: any) => {
        if (d.type === "light" && d.device_id === "light01") {
          deviceState.livingRoomLight = {
            power: d.state?.on ?? false,
            brightness: d.state?.brightness ?? 50,
          };
        } else if (d.type === "fan") {
          deviceState.fan = {
            power: d.state?.on ?? false,
            autoMode: d.state?.auto ?? false,
          };
        } else if (d.type === "door") {
          deviceState.door = {
            locked: !(d.state?.open ?? false),
            open: d.state?.open ?? false,
          };
        } else if (d.type === "window") {
          deviceState.window = {
            open: d.state?.open ?? false,
          };
        }
      });
      
      setDevices(deviceState);
      setIsServerConnected(true);
    } else {
      setIsServerConnected(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [devicesRefreshTrigger]);

  // Periodic poll devices (4s)
  useEffect(() => {
    const interval = setInterval(fetchDevices, 4000);
    return () => clearInterval(interval);
  }, []);

  // Trigger device control
  const handleDeviceCommand = async (deviceId: string, command: any) => {
    // Map frontend device IDs to backend device IDs
    const deviceIdMap: Record<string, string> = {
      livingRoomLight: 'light01',
      bedroomLight: 'light02',
      kitchenLight: 'light03',
      fan: 'fan01',
      door: 'door01',
      window: 'window01',
    };

    const backendId = deviceIdMap[deviceId] || deviceId;
    const res = await api.sendDeviceCommand(backendId, command);
    if (res.success) {
      fetchDevices();
    } else {
      addToast("网络异常，设备调控超时", "error");
    }
  };

  // Poll server connection state and scene setting
  const fetchCurrentScene = async () => {
    const res = await api.getCurrentScene();
    if (res.success && res.currentScene) {
      setActiveScene(res.currentScene as any);
      setIsServerConnected(true);
    }
  };

  useEffect(() => {
    fetchCurrentScene();
    // Poll connection state every 15 seconds
    const interval = setInterval(async () => {
      const res = await api.healthCheck();
      if (res.success) {
        setIsServerConnected(true);
      } else {
        setIsServerConnected(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Set home scene action
  const handleSetScene = async (scene: "home" | "away" | "sleep") => {
    const res = await api.setScene(scene);
    if (res.success) {
      setActiveScene(scene);
      triggerDevicesRefresh();

      const sceneLabels = { home: "回家模式", away: "离家模式", sleep: "睡眠模式" };
      addToast(`场景切换成功：系统已调整为 ${sceneLabels[scene]}`, "success");
    } else {
      addToast("场景切换失败", "error");
    }
  };

  // Lightbox Zoom toggle
  const handleOpenLightbox = (imageUrl: string, title: string) => {
    setLightbox({ isOpen: true, imageUrl, title });
  };

  const handleCloseLightbox = () => {
    setLightbox({ isOpen: false, imageUrl: "", title: "" });
  };

  // Sidebar Menu list
  const menuItems = [
    { id: "dashboard" as const, label: "智能监控大屏", icon: LayoutDashboard },
    { id: "face" as const, label: "AI 人脸门禁", icon: UserCheck },
    { id: "detect" as const, label: "YOLO 物体识别", icon: Eye },
    { id: "history" as const, label: "家居历史数据", icon: HistoryIcon },
    { id: "persons" as const, label: "成员主页管理", icon: Users },
    { id: "logs" as const, label: "核验事件日志", icon: FileText },
  ];

  const getPageTitle = () => {
    const found = menuItems.find((item) => item.id === currentView);
    return found ? found.label : "主页";
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex font-sans antialiased selection:bg-indigo-200 selection:text-indigo-800">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 hidden md:flex shadow-sm">
        
        {/* Sidebar Brand header */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-sans font-semibold tracking-tight text-gray-800">AI 智能安防系统</h1>
              <p className="text-[10px] text-gray-400 font-medium font-mono uppercase tracking-wider mt-0.5">V3.5 MULTI-AGENT</p>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1.5 mt-8">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all duration-150 relative ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-inner"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <IconComp className={`w-4.5 h-4.5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                  {item.label}
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar bottom server connection badge */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isServerConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-600">系统已连接 (本地)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-rose-500" />
                  <span className="text-[11px] font-semibold text-rose-600">服务器连接中断</span>
                </>
              )}
            </div>
            <span className="text-[9px] font-mono text-gray-400">PORT: 3000</span>
          </div>
        </div>

      </aside>

      {/* 2. Main Content Stage Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          
          <div className="flex items-center gap-3">
            {/* Mobile hamburger logo placeholder / title */}
            <div className="md:hidden w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-700">
              {getPageTitle()}
            </h2>
          </div>

          {/* Right side utilities: clock, scene buttons */}
          <div className="flex items-center gap-4">
            
            {/* Realtime clock display */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 font-mono text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {currentTime.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
              </span>
              <span className="opacity-40">|</span>
              <span className="font-semibold text-gray-700">
                {currentTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </span>
            </div>

            {/* Scenes controller */}
            <div className="flex bg-gray-100 p-1 border border-gray-200 rounded-xl">
              <button
                onClick={() => handleSetScene("home")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  activeScene === "home"
                    ? "bg-emerald-500 text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="切换到回家场景"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">回家</span>
              </button>
              <button
                onClick={() => handleSetScene("away")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  activeScene === "away"
                    ? "bg-rose-500 text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="切换到离家场景"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">离家</span>
              </button>
              <button
                onClick={() => handleSetScene("sleep")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  activeScene === "sleep"
                    ? "bg-blue-500 text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="切换到睡眠场景"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">睡眠</span>
              </button>
            </div>

          </div>

        </header>

        {/* Mobile Navigation Bar (visible only below md: breakpoint) */}
        <div className="md:hidden bg-white/90 backdrop-blur border-b border-gray-200 p-2 flex overflow-x-auto gap-1 scrollbar-none sticky top-16 z-30">
          {menuItems.map((item) => {
            const IconComp = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  isActive ? "bg-indigo-600 text-white" : "text-gray-500"
                }`}
              >
                <IconComp className="w-3 h-3" />
                {item.label.replace("智能", "").replace("AI ", "")}
              </button>
            );
          })}
        </div>

        {/* View Component Wrapper */}
        <main className="flex-1 p-6 max-w-[90rem] mx-auto w-full space-y-6">
          
          {currentView === "dashboard" && (
            <ErrorBoundary>
              <Dashboard
                devices={devices}
                onDeviceCommand={handleDeviceCommand}
                onOpenLightbox={handleOpenLightbox}
                onNavigate={(v) => setCurrentView(v as any)}
                toast={addToast}
              />
            </ErrorBoundary>
          )}

          {currentView === "face" && (
            <ErrorBoundary>
              <FaceAccess
                toast={addToast}
                onOpenLightbox={handleOpenLightbox}
              />
            </ErrorBoundary>
          )}

          {currentView === "detect" && (
            <ErrorBoundary>
              <DetectObjects
                toast={addToast}
                onOpenLightbox={handleOpenLightbox}
                refreshDevices={triggerDevicesRefresh}
              />
            </ErrorBoundary>
          )}

          {currentView === "history" && (
            <ErrorBoundary>
              <History
                toast={addToast}
              />
            </ErrorBoundary>
          )}

          {currentView === "persons" && (
            <ErrorBoundary>
              <Persons
                toast={addToast}
              />
            </ErrorBoundary>
          )}

          {currentView === "logs" && (
            <ErrorBoundary>
              <Logs
                toast={addToast}
              />
            </ErrorBoundary>
          )}

        </main>

      </div>

      {/* 3. Global Auto-Dismiss Toast Stack Portal */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 animate-slide-in-right ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : t.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            <div className="flex-1">
              <p className="text-xs font-semibold leading-relaxed">{t.text}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 4. Global Image Lightbox Modal Zoom Portal */}
      {lightbox.isOpen && (
        <div
          onClick={handleCloseLightbox}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center cursor-default bg-white border border-gray-200 p-3 rounded-2xl shadow-2xl"
          >
            {/* Header info */}
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-gray-100 px-2 text-xs text-gray-500 font-medium">
              <span>{lightbox.title}</span>
              <button
                onClick={handleCloseLightbox}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                title="关闭大图"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large Image container */}
            <div className="flex-1 overflow-hidden flex items-center justify-center w-full aspect-video rounded-lg bg-gray-100">
              <img
                src={lightbox.imageUrl}
                alt="Zoomed target"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
