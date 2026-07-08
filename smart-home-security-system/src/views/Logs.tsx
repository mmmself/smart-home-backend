import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  Clock,
} from "lucide-react";
import { SystemLog } from "../types";

interface LogsProps {
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Logs({ toast }: LogsProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Expanded Log IDs set for accordion
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  // Fetch operation logs
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const url = `/api/logs?action=${filterAction}&date=${filterDate}&page=${page}&limit=10`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotalPages(json.pagination.totalPages || 1);
        setTotalCount(json.pagination.total || 0);
      }
    } catch (err) {
      console.error("Error fetching operation logs:", err);
      toast("拉取系统日志档案出错", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterDate]);

  // Toggle JSON detailed expanding
  const handleToggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
        return "风扇自启/停";
      case "scene_change":
        return "场景切换";
      case "device_control":
        return "灯光/空调";
      default:
        return "未知操作";
    }
  };

  // Pagination Ellipsis Helper
  const renderPaginationRange = () => {
    const range: Array<number | string> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) range.push(i);
      if (page < totalPages - 2) range.push("...");
      range.push(totalPages);
    }
    return range;
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Filter Options */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        
        <div>
          <h2 className="text-base font-sans font-medium text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            系统事件与安全核验操作日志
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            实时追溯门禁验证决策、设备自动状态切换以及用户日常遥控记录。所有数据本地持久化存储。
          </p>
        </div>

        {/* Filter Selection Panel */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          
          {/* Action Type filter */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">动作类型</span>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全部动作 (All actions)</option>
              <option value="open_door_pass">开门通过 (Pass)</option>
              <option value="gate_reject">门禁拒绝 (Reject)</option>
              <option value="fan_auto">风扇自启/停 (Fan Auto)</option>
              <option value="scene_change">场景切换 (Scene Change)</option>
              <option value="device_control">设备控制 (Device Control)</option>
            </select>
          </div>

          {/* Date Picker Filter */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">动作日期</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Fast Clear Button */}
          {(filterAction || filterDate) && (
            <button
              onClick={() => {
                setFilterAction("");
                setFilterDate("");
                setPage(1);
              }}
              className="px-3.5 py-2 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs rounded-xl font-semibold transition self-end h-[34px]"
            >
              清除筛选
            </button>
          )}

        </div>

      </div>

      {/* Main Logs Table List */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
                <th className="pb-3.5 pl-2 w-10"></th>
                <th className="pb-3.5">时间</th>
                <th className="pb-3.5">动作</th>
                <th className="pb-3.5">目标实体</th>
                <th className="pb-3.5">操作者</th>
                <th className="pb-3.5">详情描述</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {logs.map((log) => {
                const isExpanded = expandedLogIds.has(log.id);
                let parsedDetails: any = {};
                try {
                  parsedDetails = JSON.parse(log.details);
                } catch {
                  parsedDetails = log.details;
                }

                return (
                  <React.Fragment key={log.id}>
                    {/* Log main row */}
                    <tr
                      onClick={() => handleToggleExpand(log.id)}
                      className="hover:bg-zinc-950/30 transition-colors cursor-pointer border-b border-zinc-850/30"
                    >
                      {/* Expansion arrow */}
                      <td className="py-4 pl-2 text-zinc-500">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 text-zinc-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString("zh-CN")}
                      </td>

                      {/* Action tag */}
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getLogBadgeColor(log.action)}`}>
                          {getLogActionZh(log.action)}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-4 font-semibold text-zinc-200">{log.target}</td>

                      {/* Operator */}
                      <td className="py-4 text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-600" />
                          {log.operator}
                        </span>
                      </td>

                      {/* Details preview */}
                      <td className="py-4 text-zinc-500 max-w-md truncate">
                        {typeof parsedDetails === "object"
                          ? JSON.stringify(parsedDetails)
                          : log.details}
                      </td>

                    </tr>

                    {/* Expandable JSON detail view row */}
                    {isExpanded && (
                      <tr className="bg-zinc-950/40">
                        <td colSpan={6} className="py-4 px-6 border-b border-zinc-850/80 text-left">
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5" />
                              完整事件元数据 (JSON METADATA)
                            </div>
                            <pre className="font-mono text-[11px] text-zinc-400 bg-zinc-950 border border-zinc-850 p-4 rounded-xl overflow-x-auto max-w-full">
                              {JSON.stringify(parsedDetails, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="text-center text-zinc-600 text-xs italic">
                      未检索到匹配当前筛选条件的日志记录。
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Smart Pagination Component */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-850 pt-5 mt-4">
            <span className="text-[10px] text-zinc-500">
              共计 <b>{totalCount}</b> 条事件，当前展示第 {page} / {totalPages} 页
            </span>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-850 rounded-xl">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {renderPaginationRange().map((pNum, i) => (
                <button
                  key={i}
                  disabled={pNum === "..."}
                  onClick={() => typeof pNum === "number" && setPage(pNum)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    pNum === page
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
