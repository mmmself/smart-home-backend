import React, { useState, useEffect } from "react";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Clock,
} from "lucide-react";
import { SystemLog } from "../types";
import * as api from "../api";

interface LogsProps {
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Logs({ toast }: LogsProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Expanded Log IDs set for accordion
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  // Fetch operation logs
  const fetchLogs = async () => {
    setIsLoading(true);
    const res = await api.getLogs({ page, limit: 10 });
    if (res.success && res.data) {
      setLogs(res.data);
      setTotalPages(res.pagination?.totalPages || Math.ceil((res.pagination?.total || 0) / 10) || 1);
      setTotalCount(res.pagination?.total || 0);
    } else {
      toast("拉取系统日志档案出错", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

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
      
      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-sans font-medium text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          系统事件与安全核验操作日志
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          实时追溯门禁验证决策、设备自动状态切换以及用户日常遥控记录。所有数据本地持久化存储。
        </p>
      </div>

      {/* Main logs Table List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold tracking-wider uppercase">
                <th className="pb-3.5 pl-2 w-10"></th>
                <th className="pb-3.5">时间</th>
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
                      className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
                    >
                      {/* Expansion arrow */}
                      <td className="py-4 pl-2 text-gray-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 text-gray-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString("zh-CN")}
                      </td>

                      {/* Target */}
                      <td className="py-4 font-semibold text-gray-700">{log.target}</td>

                      {/* Operator */}
                      <td className="py-4 text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {log.operator}
                        </span>
                      </td>

                      {/* Details preview */}
                      <td className="py-4 text-gray-400 max-w-md truncate">
                        {typeof parsedDetails === "object"
                          ? JSON.stringify(parsedDetails)
                          : log.details}
                      </td>

                    </tr>

                    {/* Expandable JSON detail view row */}
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="py-4 px-6 border-b border-gray-100 text-left">
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5" />
                              完整事件元数据 (JSON METADATA)
                            </div>
                            <pre className="font-mono text-[11px] text-gray-600 bg-white border border-gray-200 p-4 rounded-xl overflow-x-auto max-w-full">
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
                  <td colSpan={5} className="py-12">
                    <div className="text-center text-gray-400 text-xs italic">
                      暂无日志记录。
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Smart Pagination Component */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-4">
            <span className="text-[10px] text-gray-400">
              共计 <b>{totalCount}</b> 条事件，当前展示第 {page} / {totalPages} 页
            </span>

            <div className="flex items-center gap-1 bg-gray-100 p-1 border border-gray-200 rounded-xl">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
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
                      : "text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
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
