import React, { useState, useEffect } from "react";
import {
  User,
  Search,
  Plus,
  Trash2,
  Edit,
  X,
  Phone,
  Shield,
  Circle,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react";
import { Person } from "../types";

interface PersonsProps {
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Persons({ toast }: PersonsProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Drawer Form States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<"owner" | "family" | "visitor">("visitor");
  const [formStatus, setFormStatus] = useState(true);

  // Fetch persons list
  const fetchPersons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/persons?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=7`);
      const json = await res.json();
      if (json.success) {
        setPersons(json.data);
        setTotalPages(json.pagination.totalPages || 1);
        setTotalCount(json.pagination.total || 0);
      }
    } catch (err) {
      console.error("Error fetching persons list:", err);
      toast("拉取人员名单失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, [page, searchQuery]);

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setEditingPerson(null);
    setFormName("");
    setFormPhone("");
    setFormRole("visitor");
    setFormStatus(true);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (p: Person) => {
    setEditingPerson(p);
    setFormName(p.name);
    setFormPhone(p.phone);
    setFormRole(p.role);
    setFormStatus(p.status);
    setIsDrawerOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast("姓名不能为空", "error");
      return;
    }

    const payload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      role: formRole,
      status: formStatus,
    };

    try {
      let url = "/api/persons";
      let method = "POST";
      if (editingPerson) {
        url = `/api/persons/${editingPerson.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast(editingPerson ? "人员信息已更新" : "成功录入新成员信息", "success");
        setIsDrawerOpen(false);
        fetchPersons();
      } else {
        toast("操作失败: " + json.error, "error");
      }
    } catch (err) {
      toast("提交表单异常", "error");
    }
  };

  // Delete Person with Double-Confirmation
  const handleDelete = async (p: Person) => {
    const doubleConfirm = window.confirm(
      `警告：确认要删除人员「${p.name}」吗？\n此操作会一并擦除此人在系统的所有注册人脸底片 (${p.faceCount || 0} 张)且不可逆！`
    );
    if (!doubleConfirm) return;

    try {
      const res = await fetch(`/api/persons/${p.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast(`已删除人员: ${p.name}`, "success");
        fetchPersons();
      } else {
        toast("删除失败: " + json.error, "error");
      }
    } catch (err) {
      toast("操作异常", "error");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-amber-950/50 border border-amber-500/20 text-amber-400";
      case "family":
        return "bg-emerald-950/50 border border-emerald-500/20 text-emerald-400";
      case "visitor":
        return "bg-zinc-900 border border-zinc-800 text-zinc-500";
      default:
        return "bg-zinc-900 text-zinc-400";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner": return "户主";
      case "family": return "家人";
      case "visitor": return "访客";
      default: return role;
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
      
      {/* Search and Filters header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        
        <div>
          <h2 className="text-base font-sans font-medium text-zinc-100 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            成员资料与面部主档数据库
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            统一维护业主、家属、快递等高频访客的主页档案，启用禁用核验身份。
          </p>
        </div>

        {/* Action area */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-zinc-500" />
            <input
              type="text"
              placeholder="姓名 / 角色 / 电话搜索..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset page
              }}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800/80 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap shadow-lg shadow-indigo-950/40"
          >
            <Plus className="w-4 h-4" />
            录入新成员
          </button>
        </div>

      </div>

      {/* Main Persons Table Layout */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
                <th className="pb-3.5 pl-2">ID</th>
                <th className="pb-3.5">成员姓名</th>
                <th className="pb-3.5">联系电话</th>
                <th className="pb-3.5">角色定位</th>
                <th className="pb-3.5">注册底图数</th>
                <th className="pb-3.5">核验状态</th>
                <th className="pb-3.5">录入时间</th>
                <th className="pb-3.5 text-right pr-2">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/40 text-xs">
              {persons.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-950/30 transition-colors group">
                  
                  {/* ID */}
                  <td className="py-4 pl-2 font-mono text-[10px] text-zinc-500">{p.id}</td>

                  {/* Name */}
                  <td className="py-4 font-semibold text-zinc-200">{p.name}</td>

                  {/* Phone */}
                  <td className="py-4 text-zinc-400 font-mono">
                    {p.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-600" />
                        {p.phone}
                      </span>
                    ) : (
                      <span className="text-zinc-600 italic">未留存</span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${getRoleBadge(p.role)}`}>
                      {getRoleLabel(p.role)}
                    </span>
                  </td>

                  {/* Registered face photos */}
                  <td className="py-4 font-semibold text-indigo-400">
                    <span className="flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-zinc-600" />
                      {p.faceCount || 0} 张
                    </span>
                  </td>

                  {/* Status Toggle indicator */}
                  <td className="py-4">
                    <span className={`flex items-center gap-1.5 font-medium ${
                      p.status ? "text-emerald-400" : "text-rose-500"
                    }`}>
                      <Circle className={`w-2 h-2 fill-current ${p.status ? "animate-pulse" : ""}`} />
                      {p.status ? "允许通行" : "临时黑名单"}
                    </span>
                  </td>

                  {/* Creation Time */}
                  <td className="py-4 text-zinc-500 font-mono text-[11px]">
                    {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                  </td>

                  {/* Actions */}
                  <td className="py-4 text-right pr-2">
                    <div className="flex items-center justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                        title="编辑信息"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1 rounded hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition"
                        title="安全删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}

              {persons.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-12">
                    <div className="text-center text-zinc-600 text-xs italic">
                      未发现符合检索词的人员主档。
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
              共 <b>{totalCount}</b> 位成员，当前展示第 {page} / {totalPages} 页
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

      {/* Right side form drawer overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          
          {/* Dismiss area */}
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />

          {/* Drawer Body */}
          <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full flex flex-col p-6 shadow-2xl justify-between animate-slide-in">
            
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  {editingPerson ? "编辑授权主页档案" : "新建授权主页档案"}
                </h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded bg-zinc-950 hover:bg-zinc-850 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">1. 人员真实姓名 (必填)</label>
                  <input
                    type="text"
                    required
                    placeholder="输入姓名, 例: 张建国"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">2. 留存手机号码 (选填)</label>
                  <input
                    type="tel"
                    placeholder="例: 13800138000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">3. 成员身份定位 (必填)</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="owner">业主户主 (Owner)</option>
                    <option value="family">家庭直系成员 (Family)</option>
                    <option value="visitor">短期备案访客/物流 (Visitor)</option>
                  </select>
                </div>

                {/* Status toggle switch */}
                <div className="space-y-1.5 border-t border-zinc-800/80 pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-zinc-300">门禁放行许可状态</span>
                      <span className="text-[10px] text-zinc-500">开启才可进行人脸刷脸快速开锁。</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setFormStatus(!formStatus)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                        formStatus ? "bg-indigo-600" : "bg-zinc-850"
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition duration-200 transform ${
                        formStatus ? "translate-x-4.5" : ""
                      }`} />
                    </button>
                  </div>
                </div>

              </form>
            </div>

            {/* Actions bottom */}
            <div className="flex gap-3 border-t border-zinc-800/80 pt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                确认提交
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-xs font-medium transition"
              >
                取消
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
