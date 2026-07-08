import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  History as HistoryIcon,
  Sliders,
  Calendar,
  Layers,
  Thermometer,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SensorReading, SystemLog } from "../types";
import * as api from "../api";

interface HistoryProps {
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function History({ toast }: HistoryProps) {
  const [metric, setMetric] = useState<"temperature" | "humidity">("temperature");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "today">("24h");
  const [granularity, setGranularity] = useState<"5m" | "1h">("1h");

  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all historical data on filter updates
  const fetchData = async () => {
    setIsLoading(true);

    // 1. Fetch sensor history
    const sensRes = await api.getSensorHistory(metric === 'temperature' ? 'temperature' : 'humidity');
    if (sensRes.success && sensRes.data) {
      let rawData: SensorReading[] = sensRes.data;

      // Apply Time Filter
      const now = new Date();
      if (timeRange === "today") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        rawData = rawData.filter((r) => new Date(r.timestamp) >= startOfToday);
      } else if (timeRange === "24h") {
        const past24h = new Date(now.getTime() - 24 * 3600 * 1000);
        rawData = rawData.filter((r) => new Date(r.timestamp) >= past24h);
      }

      // Apply Granularity filtering
      if (granularity === "1h") {
        rawData = rawData.filter((_, idx) => idx % 2 === 0);
      }

      setSensorHistory(rawData);
    }

    // 2. Fetch recent device changes logs
    const logRes = await api.getLogs({ action: 'device_control', limit: 15 });
    if (logRes.success && logRes.data) {
      setDeviceLogs(logRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, granularity]);

  // Compute metric stats
  const values = sensorHistory.map((r) => r[metric]);
  const stats = {
    avg: values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (timeRange === "today") {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
    } catch {
      return "";
    }
  };

  // Label settings
  const labelText = metric === "temperature" ? "温度" : "湿度";
  const unitText = metric === "temperature" ? "°C" : "%";
  const themeColor = metric === "temperature" ? "#f59e0b" : "#6366f1"; // Amber or Indigo

  return (
    <div className="space-y-6">
      
      {/* Filters top section */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        
        <div>
          <h2 className="text-base font-sans font-medium text-gray-800 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-indigo-500" />
            家居历史指标与状态分析
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            聚合历史传感器温湿度数据，展现趋势峰值、状态演变并分析设备耗电/联动效能。
          </p>
        </div>

        {/* Action filter controls */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Selector 1: Metric */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">分析指标</span>
            <div className="flex bg-gray-100 p-1 border border-gray-200 rounded-xl">
              <button
                onClick={() => setMetric("temperature")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  metric === "temperature" ? "bg-amber-100 text-amber-700 border border-amber-300" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                温度
              </button>
              <button
                onClick={() => setMetric("humidity")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  metric === "humidity" ? "bg-indigo-100 text-indigo-700 border border-indigo-300" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                湿度
              </button>
            </div>
          </div>

          {/* Selector 2: Range */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">时间筛选</span>
            <div className="flex bg-gray-100 p-1 border border-gray-200 rounded-xl">
              <button
                onClick={() => setTimeRange("24h")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeRange === "24h" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                近 24h
              </button>
              <button
                onClick={() => setTimeRange("today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeRange === "today" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                今天
              </button>
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeRange === "7d" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                近 7 天
              </button>
            </div>
          </div>

          {/* Selector 3: Granularity */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">粒度大小</span>
            <div className="flex bg-gray-100 p-1 border border-gray-200 rounded-xl">
              <button
                onClick={() => setGranularity("5m")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  granularity === "5m" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                5 分钟
              </button>
              <button
                onClick={() => setGranularity("1h")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  granularity === "1h" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                1 小时
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Maximum */}
        <div className="p-5 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-sans text-gray-500 font-medium tracking-wide">周期最高{labelText}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-semibold text-gray-700">{stats.max}</span>
              <span className="text-xs text-gray-400">{unitText}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Minimum */}
        <div className="p-5 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-sans text-gray-500 font-medium tracking-wide">周期最低{labelText}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-semibold text-gray-700">{stats.min}</span>
              <span className="text-xs text-gray-400">{unitText}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Average */}
        <div className="p-5 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-sans text-gray-500 font-medium tracking-wide">周期平均{labelText}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-semibold text-gray-700">{stats.avg}</span>
              <span className="text-xs text-gray-400">{unitText}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Grid: Shaded Area Chart vs Device Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Shaded Area Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              历史包络面积图 ({labelText})
            </h3>
            <span className="text-[10px] text-gray-400">BOUNDS & MIDLINES</span>
          </div>

          <div className="h-80 w-full p-2 bg-gray-50 rounded-xl border border-gray-200">
            {sensorHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={themeColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
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
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={themeColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#areaColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400 font-mono">
                No metric coordinates for selected range.
              </div>
            )}
          </div>
        </div>

        {/* Device changes state list (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              设备状态变化记录 (最近15次)
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Device State Log</span>
          </div>

          <div className="space-y-3.5 max-h-[22rem] overflow-y-auto pr-1">
            {deviceLogs.map((log) => {
              let parsedDetails: any = {};
              try {
                parsedDetails = JSON.parse(log.details);
              } catch {}

              const isSystem = log.operator === "System" || log.operator === "YOLO Linkage";

              return (
                <div key={log.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-700">{log.target}</span>
                    <span className="text-[9px] font-mono text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString("zh-CN")}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {/* Command detailed description */}
                    <div className="text-[10px] text-gray-500">
                      操作详情:{" "}
                      <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                        {log.details}
                      </span>
                    </div>

                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isSystem 
                        ? "bg-indigo-100 border border-indigo-200 text-indigo-600" 
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {log.operator}
                    </span>
                  </div>
                </div>
              );
            })}

            {deviceLogs.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs italic">
                暂无设备更改行为数据。
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
