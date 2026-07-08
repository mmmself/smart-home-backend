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
    try {
      // 1. Fetch sensor history
      const sensRes = await fetch("/api/sensors/history");
      const sensJson = await sensRes.json();
      if (sensJson.success) {
        let rawData: SensorReading[] = sensJson.data;

        // Apply Time Filter
        const now = new Date();
        if (timeRange === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          rawData = rawData.filter((r) => new Date(r.timestamp) >= startOfToday);
        } else if (timeRange === "24h") {
          const past24h = new Date(now.getTime() - 24 * 3600 * 1000);
          rawData = rawData.filter((r) => new Date(r.timestamp) >= past24h);
        } // 7d is just all data since we seeded 24h as a baseline

        // Apply Granularity filtering
        if (granularity === "1h") {
          // just display hourly coordinates
          rawData = rawData.filter((_, idx) => idx % 2 === 0);
        }

        setSensorHistory(rawData);
      }

      // 2. Fetch recent device changes logs
      const logRes = await fetch("/api/logs?action=device_control&limit=15");
      const logJson = await logRes.json();
      if (logJson.success) {
        setDeviceLogs(logJson.data);
      }
    } catch (err) {
      console.error("Error fetching history metrics:", err);
      toast("拉取历史数据异常", "error");
    } finally {
      setIsLoading(false);
    }
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
  const themeColor = metric === "temperature" ? "#fbbf24" : "#6366f1"; // Amber or Indigo

  return (
    <div className="space-y-6">
      
      {/* Filters top section */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        
        <div>
          <h2 className="text-base font-sans font-medium text-zinc-100 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-indigo-400" />
            家居历史指标与状态分析
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            聚合历史传感器温湿度数据，展现趋势峰值、状态演变并分析设备耗电/联动效能。
          </p>
        </div>

        {/* Action filter controls */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Selector 1: Metric */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">分析指标</span>
            <div className="flex bg-zinc-950 p-1 border border-zinc-850 rounded-xl">
              <button
                onClick={() => setMetric("temperature")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  metric === "temperature" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                温度
              </button>
              <button
                onClick={() => setMetric("humidity")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  metric === "humidity" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                湿度
              </button>
            </div>
          </div>

          {/* Selector 2: Range */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">时间筛选</span>
            <div className="flex bg-zinc-950 p-1 border border-zinc-850 rounded-xl">
              <button
                onClick={() => setTimeRange("24h")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeRange === "24h" ? "bg-zinc-850 text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                近 24h
              </button>
              <button
                onClick={() => setTimeRange("today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeRange === "today" ? "bg-zinc-850 text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                今天
              </button>
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeRange === "7d" ? "bg-zinc-850 text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                近 7 天
              </button>
            </div>
          </div>

          {/* Selector 3: Granularity */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">粒度大小</span>
            <div className="flex bg-zinc-950 p-1 border border-zinc-850 rounded-xl">
              <button
                onClick={() => setGranularity("5m")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  granularity === "5m" ? "bg-zinc-850 text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                5 分钟
              </button>
              <button
                onClick={() => setGranularity("1h")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  granularity === "1h" ? "bg-zinc-850 text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
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
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans text-zinc-500 font-medium tracking-wide">周期最高{labelText}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-semibold text-zinc-200">{stats.max}</span>
              <span className="text-xs text-zinc-500">{unitText}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Minimum */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans text-zinc-500 font-medium tracking-wide">周期最低{labelText}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-semibold text-zinc-200">{stats.min}</span>
              <span className="text-xs text-zinc-500">{unitText}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Average */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans text-zinc-500 font-medium tracking-wide">周期平均{labelText}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-semibold text-zinc-200">{stats.avg}</span>
              <span className="text-xs text-zinc-500">{unitText}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Grid: Shaded Area Chart vs Device Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Shaded Area Chart (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-6">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              历史包络面积图 ({labelText})
            </h3>
            <span className="text-[10px] text-zinc-500">BOUNDS & MIDLINES</span>
          </div>

          <div className="h-80 w-full p-2 bg-zinc-950/40 rounded-xl border border-zinc-850">
            {sensorHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={themeColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
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
              <div className="flex items-center justify-center h-full text-xs text-zinc-500 font-mono">
                No metric coordinates for selected range.
              </div>
            )}
          </div>
        </div>

        {/* Device changes state list (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              设备状态变化记录 (最近15次)
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Device State Log</span>
          </div>

          <div className="space-y-3.5 max-h-[22rem] overflow-y-auto pr-1">
            {deviceLogs.map((log) => {
              let parsedDetails: any = {};
              try {
                parsedDetails = JSON.parse(log.details);
              } catch {}

              const isSystem = log.operator === "System" || log.operator === "YOLO Linkage";

              return (
                <div key={log.id} className="border-b border-zinc-850/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-zinc-300">{log.target}</span>
                    <span className="text-[9px] font-mono text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString("zh-CN")}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {/* Command detailed description */}
                    <div className="text-[10px] text-zinc-500">
                      操作详情:{" "}
                      <span className="text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded font-mono">
                        {log.details}
                      </span>
                    </div>

                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isSystem 
                        ? "bg-indigo-950/40 border border-indigo-900/30 text-indigo-400" 
                        : "bg-zinc-850 text-zinc-400"
                    }`}>
                      {log.operator}
                    </span>
                  </div>
                </div>
              );
            })}

            {deviceLogs.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs italic">
                暂无设备更改行为数据。
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
