import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Camera,
  UploadCloud,
  FileImage,
  RefreshCw,
  Key,
  Database,
  Lock,
  Unlock,
  Clipboard,
} from "lucide-react";
import { Person, FaceRecord } from "../types";
import EmptyState from "../components/EmptyState";

interface FaceAccessProps {
  toast: (msg: string, type: "success" | "error" | "info") => void;
  onOpenLightbox: (imageUrl: string, title: string) => void;
}

interface VerificationRecord {
  timestamp: string;
  image: string;
  status: "pass" | "reject" | "no_face";
  name?: string;
  confidence: number;
  message: string;
}

export default function FaceAccess({ toast, onOpenLightbox }: FaceAccessProps) {
  const [activeTab, setActiveTab] = useState<"verify" | "library">("verify");
  
  // Verification states
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyHistory, setVerifyHistory] = useState<VerificationRecord[]>([]);

  // Library states
  const [libraryData, setLibraryData] = useState<Array<{ person: Person; faces: FaceRecord[] }>>([]);
  const [personsList, setPersonsList] = useState<Person[]>([]);
  const [isLoadingLibrary, setIsLoadingLoadingLibrary] = useState(false);

  // New Enroll states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollPersonId, setEnrollPersonId] = useState("");
  const [enrollImage, setEnrollImage] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const enrollFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch libraries
  const fetchLibrary = async () => {
    setIsLoadingLoadingLibrary(true);
    try {
      const res = await fetch("/api/face/library");
      const json = await res.json();
      if (json.success) {
        setLibraryData(json.data);
      }

      // Fetch all persons to populate selection
      const pRes = await fetch("/api/persons?limit=100");
      const pJson = await pRes.json();
      if (pJson.success) {
        setPersonsList(pJson.data);
      }
    } catch (err) {
      console.error("Failed to fetch face library:", err);
    } finally {
      setIsLoadingLoadingLibrary(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Handle Ctrl+V global pasting of image
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== "verify") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setQueryImage(event.target.result as string);
                setVerifyResult(null);
                toast("图片已从剪贴板粘贴", "success");
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEnroll: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (isEnroll) {
            setEnrollImage(event.target.result as string);
          } else {
            setQueryImage(event.target.result as string);
            setVerifyResult(null);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, isEnroll: boolean = false) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (isEnroll) {
            setEnrollImage(event.target.result as string);
          } else {
            setQueryImage(event.target.result as string);
            setVerifyResult(null);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Verify function
  const handleVerify = async (scenario?: "pass" | "reject" | "no_face") => {
    if (!queryImage && !scenario) {
      toast("请先上传或粘贴一张人脸照片", "error");
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);

    // If simulating, we can send a small placeholder base64 or the uploaded image
    const finalImage = queryImage || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    try {
      const res = await fetch("/api/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalImage,
          scenario,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setVerifyResult(json.result);
        
        // Add to local history list (capped at 5)
        const record: VerificationRecord = {
          timestamp: new Date().toISOString(),
          image: finalImage,
          status: json.result.status,
          name: json.result.name,
          confidence: json.result.confidence,
          message: json.result.message,
        };
        
        setVerifyHistory((prev) => [record, ...prev].slice(0, 5));

        if (json.result.status === "pass") {
          toast(`验证通过：欢迎 ${json.result.name} 回家！`, "success");
        } else if (json.result.status === "reject") {
          toast("门禁拒绝：未识别该人脸信息！", "error");
        } else {
          toast("未检测到有效人脸，请重试！", "info");
        }
      } else {
        toast("验证失败: " + json.error, "error");
      }
    } catch (err: any) {
      toast("接口调用出错", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // Enroll new face
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollPersonId) {
      toast("请选择关联人员", "error");
      return;
    }
    if (!enrollImage) {
      toast("请选择人脸图片", "error");
      return;
    }

    setIsEnrolling(true);
    try {
      const res = await fetch("/api/face/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: enrollPersonId,
          image: enrollImage,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast("人脸照片注册成功！", "success");
        setShowEnrollModal(false);
        setEnrollImage(null);
        setEnrollPersonId("");
        fetchLibrary(); // Refresh library data
      } else {
        toast("注册失败: " + json.error, "error");
      }
    } catch (err) {
      toast("人脸数据库更新失败", "error");
    } finally {
      setIsEnrolling(false);
    }
  };

  // Delete face photo
  const handleDeleteFace = async (id: string) => {
    if (!window.confirm("确认要从系统中删除此张人脸底图吗？")) {
      return;
    }

    try {
      const res = await fetch(`/api/face/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast("删除成功", "success");
        fetchLibrary();
      } else {
        toast("删除失败: " + json.error, "error");
      }
    } catch (err) {
      toast("删除人脸记录出错", "error");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <div>
          <h2 className="text-base font-sans font-medium text-zinc-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            AI 人脸识别门禁系统
          </h2>
          <p className="text-xs text-zinc-400 mt-1">支持实时特征比对、陌生人预警、门禁极速通关与人员人脸底片管理。</p>
        </div>

        {/* Tabs switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("verify")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition duration-150 flex items-center gap-1.5 ${
              activeTab === "verify"
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            门禁验证
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition duration-150 flex items-center gap-1.5 ${
              activeTab === "library"
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            人脸底图库 ({libraryData.reduce((acc, curr) => acc + curr.faces.length, 0)})
          </button>
        </div>
      </div>

      {/* Tab Content 1: Gate Verify */}
      {activeTab === "verify" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Upload and Interactive Test (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Upload Area */}
            <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
              <h3 className="text-sm font-medium text-zinc-200 mb-4 flex items-center justify-between">
                <span>1. 输入待验证的人脸照片</span>
                <span className="text-[10px] text-zinc-500 font-mono">SUPPORT DROP, CLICK & PASTE (Ctrl+V)</span>
              </h3>

              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition ${
                  queryImage
                    ? "border-zinc-700 bg-zinc-950/40"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e, false)}
                  accept="image/*"
                  className="hidden"
                />

                {queryImage ? (
                  <div className="absolute inset-0 p-2 flex items-center justify-center">
                    <img
                      src={queryImage}
                      alt="Query preview"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    <div className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-zinc-800 transition">
                      更改照片
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-300">拖拽、点击或使用 Ctrl+V 粘贴人脸图片</p>
                      <p className="text-[10px] text-zinc-500 mt-1">支持 JPG, PNG, WEBP 格式</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Testing Scenarios */}
              <div className="mt-6 border-t border-zinc-800/60 pt-5">
                <div className="text-xs text-zinc-400 font-medium mb-3 flex items-center justify-between">
                  <span>场景测试快捷方式</span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30">
                    无需上传，点击直接跑真接口
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleVerify("pass")}
                    disabled={isVerifying}
                    className="py-2.5 px-3 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    模拟通过
                  </button>
                  <button
                    onClick={() => handleVerify("reject")}
                    disabled={isVerifying}
                    className="py-2.5 px-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/50 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    模拟拒绝
                  </button>
                  <button
                    onClick={() => handleVerify("no_face")}
                    disabled={isVerifying}
                    className="py-2.5 px-3 bg-zinc-900/50 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <UserX className="w-4 h-4" />
                    模拟无人脸
                  </button>
                </div>
              </div>

              {/* Active action button */}
              {queryImage && (
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => handleVerify()}
                    disabled={isVerifying}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-950/40"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        特征比对中...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        提交流程比对
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setQueryImage(null);
                      setVerifyResult(null);
                    }}
                    className="px-4 py-3 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-300 rounded-xl text-xs font-medium transition"
                  >
                    重置
                  </button>
                </div>
              )}
            </div>

            {/* Recent 5 Records */}
            <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
              <h3 className="text-sm font-medium text-zinc-200 mb-4 flex items-center justify-between">
                <span>最近门禁核验记录 (5次)</span>
                <span className="text-[10px] text-zinc-500 font-mono">Real-time Records</span>
              </h3>

              <div className="space-y-3">
                {verifyHistory.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-850 bg-zinc-950/40"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => onOpenLightbox(rec.image, "核验抓拍图")}
                        className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-850 overflow-hidden cursor-pointer"
                      >
                        <img src={rec.image} alt="capture" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200">
                            {rec.status === "pass" ? rec.name : rec.status === "reject" ? "陌生人访客" : "无有效人脸"}
                          </span>
                          <span
                            className={`px-1 text-[9px] font-medium border rounded ${
                              rec.status === "pass"
                                ? "bg-emerald-950/50 border-emerald-500/25 text-emerald-400"
                                : rec.status === "reject"
                                ? "bg-rose-950/50 border-rose-500/25 text-rose-400"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500"
                            }`}
                          >
                            {rec.status === "pass" ? "认证成功" : rec.status === "reject" ? "访客拒绝" : "无人脸"}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{rec.message}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-zinc-500 block">
                        {new Date(rec.timestamp).toLocaleTimeString("zh-CN")}
                      </span>
                      {rec.status !== "no_face" && (
                        <span className="text-[10px] font-mono font-medium text-indigo-400 mt-1 block">
                          相似度 {Math.round(rec.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {verifyHistory.length === 0 && (
                  <div className="text-center py-6 text-zinc-500 text-xs italic">
                    暂无本会话核验数据。你可以上传或点击模拟场景启动核验。
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right panel: Live inference result (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 backdrop-blur-md min-h-[15rem] flex flex-col">
              <h3 className="text-sm font-medium text-zinc-200 border-b border-zinc-800 pb-3 mb-6 flex items-center justify-between">
                <span>比对结果与联动控制</span>
                <span className="text-[10px] text-zinc-500 font-mono">INTELLIGENT DECISIONS</span>
              </h3>

              {isVerifying ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-300">Gemini 3.5 多模态视觉推理中...</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">提取人脸五官特征，进行全局特征关联比对</p>
                  </div>
                </div>
              ) : verifyResult ? (
                <div className="flex-1 flex flex-col justify-between space-y-6 animate-fade-in">
                  
                  {/* Result Header */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      verifyResult.status === "pass"
                        ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-400"
                        : verifyResult.status === "reject"
                        ? "bg-rose-950/50 border border-rose-500/30 text-rose-400"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                    }`}>
                      {verifyResult.status === "pass" ? (
                        <UserCheck className="w-6 h-6" />
                      ) : (
                        <UserX className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-base font-semibold ${
                          verifyResult.status === "pass"
                            ? "text-emerald-400"
                            : verifyResult.status === "reject"
                            ? "text-rose-400"
                            : "text-zinc-400"
                        }`}>
                          {verifyResult.status === "pass" ? "比对一致 • 允许通行" : verifyResult.status === "reject" ? "陌生人 • 拒绝通行" : "未检出人脸"}
                        </h4>
                        <span className="text-xs font-mono text-zinc-500">
                          {Math.round(verifyResult.confidence * 100)}% 相似
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-medium">{verifyResult.message}</p>
                    </div>
                  </div>

                  {/* Device automation details */}
                  <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                    <div className="text-xs text-zinc-400 font-semibold">门禁联动执行记录:</div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-zinc-500">执行动作</span>
                      <span className={`${verifyResult.status === "pass" ? "text-emerald-400" : "text-zinc-500"}`}>
                        {verifyResult.status === "pass" ? "防盗门锁已释放 (解锁5秒)" : "门锁锁定"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium border-t border-zinc-800/60 pt-2.5">
                      <span className="text-zinc-500">门锁组件动画</span>
                      <span className="flex items-center gap-1 font-semibold text-zinc-300">
                        {verifyResult.status === "pass" ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                            解锁状态
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-400" />
                            锁定状态
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Note info */}
                  <div className="text-[10px] text-zinc-500">
                    * 人脸验证成功后，系统会全自动发出微服务设备指令，开启动态户型图中的防盗门锁，并安全记入操作日志。
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10">
                  <Camera className="w-8 h-8 text-zinc-600 mb-3" />
                  <p className="text-xs text-zinc-400">等待提交人脸验证申请</p>
                  <p className="text-[10px] text-zinc-600 max-w-xs mt-1">
                    在左侧区域上传人脸，或直接使用快捷场景按钮进行一次快速的全流程特征比对。
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* Tab Content 2: Library Management */}
      {activeTab === "library" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-400" />
              注册授权人脸图册 ({libraryData.reduce((acc, curr) => acc + curr.faces.length, 0)} 张底图)
            </div>
            
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              注册新底片
            </button>
          </div>

          {/* Library Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {libraryData.map(({ person, faces }) => (
              <div key={person.id} className="bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-5 space-y-4">
                
                {/* Person banner */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{person.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                        person.role === "owner"
                          ? "bg-amber-950/50 border-amber-500/20 text-amber-400"
                          : person.role === "family"
                          ? "bg-emerald-950/50 border-emerald-500/20 text-emerald-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      }`}>
                        {person.role === "owner" ? "户主" : person.role === "family" ? "家人" : "访客"}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{person.phone || "无电话"}</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-1 border border-zinc-850 rounded-lg">
                    底图: {faces.length} 张
                  </span>
                </div>

                {/* Face thumbnails list for this person */}
                <div className="grid grid-cols-3 gap-3">
                  {faces.map((face) => (
                    <div key={face.id} className="group relative aspect-square bg-zinc-950 rounded-lg overflow-hidden border border-zinc-850">
                      <img src={face.image} alt="face photo" className="w-full h-full object-cover" />
                      
                      {/* Overlay delete and zoom */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => onOpenLightbox(face.image, `${person.name} 的人脸底片`)}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          title="查看大图"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFace(face.id)}
                          className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/30"
                          title="删除底片"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Fast add button thumbnail */}
                  <div
                    onClick={() => {
                      setEnrollPersonId(person.id);
                      setShowEnrollModal(true);
                    }}
                    className="aspect-square border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/50 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition gap-1"
                  >
                    <Plus className="w-4 h-4 text-zinc-500" />
                    <span className="text-[8px] text-zinc-500">追加底图</span>
                  </div>
                </div>

              </div>
            ))}

            {libraryData.length === 0 && !isLoadingLibrary && (
              <div className="col-span-3">
                <EmptyState
                  icon="Database"
                  title="人脸库暂无底片"
                  description="系统未录入任何人员人脸。请在人员管理录入人员，或点击右上角直接为此系统用户追加第一张面部底片。"
                  actionLabel="注册新底片"
                  onAction={() => setShowEnrollModal(true)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enroll Face Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                注册关联人脸底图
              </h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollImage(null);
                  setEnrollPersonId("");
                }}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                关闭
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              
              {/* Select Person */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium">1. 选择注册目标人员 (必填)</label>
                <select
                  value={enrollPersonId}
                  onChange={(e) => setEnrollPersonId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- 请选择系统授权人员 --</option>
                  {personsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role === "owner" ? "户主" : p.role === "family" ? "家人" : "访客"}) - {p.phone || "无号码"}
                    </option>
                  ))}
                </select>
                {personsList.length === 0 && (
                  <span className="text-[10px] text-rose-400 block">系统暂无人员，请先在人员管理添加人员！</span>
                )}
              </div>

              {/* Upload image zone */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium">2. 上传面部正视原图</label>
                
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, true)}
                  onClick={() => enrollFileInputRef.current?.click()}
                  className="aspect-video rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40 cursor-pointer flex flex-col items-center justify-center relative p-4"
                >
                  <input
                    type="file"
                    ref={enrollFileInputRef}
                    onChange={(e) => handleFileChange(e, true)}
                    accept="image/*"
                    className="hidden"
                  />

                  {enrollImage ? (
                    <img src={enrollImage} alt="Preview face" className="max-w-full max-h-full object-contain rounded" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Camera className="w-8 h-8 text-zinc-500 mx-auto" />
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-400">点击或拖入照片底片</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">请确保人脸清晰无遮挡</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 border-t border-zinc-800/60 pt-4">
                <button
                  type="submit"
                  disabled={isEnrolling || !enrollImage || !enrollPersonId}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  {isEnrolling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      底片入库中...
                    </>
                  ) : (
                    "确认注册入库"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollImage(null);
                    setEnrollPersonId("");
                  }}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition"
                >
                  取消
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
