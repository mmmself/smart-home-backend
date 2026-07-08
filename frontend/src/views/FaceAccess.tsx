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
import * as api from "../api";

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
  const [libraryData, setLibraryData] = useState<Array<{ person: { id: number; name: string; phone?: string; role?: string }; faces: Array<{ id: number; image: string }> }>>([]);
  const [personsList, setPersonsList] = useState<Person[]>([]);
  const [isLoadingLibrary, setIsLoadingLoadingLibrary] = useState(false);

  // New Enroll states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollPersonId, setEnrollPersonId] = useState("");
  const [enrollImage, setEnrollImage] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isLockControlling, setIsLockControlling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const enrollFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch libraries
  const fetchLibrary = async () => {
    setIsLoadingLoadingLibrary(true);
    const res = await api.getFaceLibrary();
    if (res.success && res.data) {
      // Transform backend format to frontend format
      const baseUrl = import.meta.env.VITE_API_BASE || "";
      const transformed = res.data.map((item: any) => ({
        person: {
          id: item.person_id,
          name: item.name,
          phone: item.phone,
          role: item.role || "visitor",
        },
        faces: (item.faces || []).map((f: any) => ({
          id: f.id,
          image: f.image_path ? `${baseUrl}${f.image_path}` : "",
        })),
      }));
      setLibraryData(transformed);
    }

    // Fetch all persons to populate selection
    const pRes = await api.getPersons({ limit: 100 });
    if (pRes.success && pRes.data) {
      setPersonsList(pRes.data);
    }
    setIsLoadingLoadingLibrary(false);
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

    // Convert base64 to File if needed
    let file: File | null = null;
    if (queryImage && queryImage.startsWith('data:')) {
      const res = await fetch(queryImage);
      const blob = await res.blob();
      file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    } else if (queryImage) {
      const res = await fetch(queryImage);
      const blob = await res.blob();
      file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    }

    if (!file) {
      toast("请先上传或粘贴一张人脸照片", "error");
      setIsVerifying(false);
      return;
    }

    const apiRes = await api.verifyFace(file);
    if (apiRes.success && apiRes.data) {
      const result = apiRes.data;
      setVerifyResult({
        status: result.pass ? 'pass' : 'reject',
        name: result.person?.name,
        confidence: result.score,
        message: result.pass ? `验证通过：欢迎 ${result.person?.name}！` : '验证失败：未识别该人脸',
      });

      // Add to local history
      const record: VerificationRecord = {
        timestamp: new Date().toISOString(),
        image: queryImage || '',
        status: result.pass ? 'pass' : 'reject',
        name: result.person?.name,
        confidence: result.score,
        message: result.pass ? `验证通过：欢迎 ${result.person?.name}！` : '验证失败：未识别该人脸',
      };
      setVerifyHistory((prev) => [record, ...prev].slice(0, 5));

      if (result.pass) {
        toast(`验证通过：欢迎 ${result.person?.name} 回家！`, "success");
      } else {
        toast("门禁拒绝：未识别该人脸信息！", "error");
      }
    } else {
      toast("验证失败: " + apiRes.error, "error");
    }
    setIsVerifying(false);
  };

  // Enroll new face
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const personId = parseInt(enrollPersonId, 10);
    if (!enrollPersonId || isNaN(personId) || personId <= 0) {
      toast("请选择关联人员", "error");
      return;
    }
    if (!enrollImage) {
      toast("请选择人脸图片", "error");
      return;
    }

    setIsEnrolling(true);

    // Convert base64 to File
    let file: File | null = null;
    if (enrollImage && enrollImage.startsWith('data:')) {
      try {
        const res = await fetch(enrollImage);
        const blob = await res.blob();
        file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
      } catch (err) {
        toast("图片处理失败", "error");
        setIsEnrolling(false);
        return;
      }
    }

    if (!file || file.size === 0) {
      toast("请选择人脸图片", "error");
      setIsEnrolling(false);
      return;
    }

    const res = await api.enrollFace(personId, file);
    if (res.success) {
      toast("人脸照片注册成功！", "success");
      setShowEnrollModal(false);
      setEnrollImage(null);
      setEnrollPersonId("");
      fetchLibrary();
    } else {
      toast("注册失败: " + res.error, "error");
    }
    setIsEnrolling(false);
  };

  // Delete face photo
  const handleDeleteFace = async (id: string | number) => {
    if (!window.confirm("确认要从系统中删除此张人脸底图吗？")) {
      return;
    }

    const res = await api.deleteFace(Number(id));
    if (res.success) {
      toast("删除成功", "success");
      fetchLibrary();
    } else {
      toast("删除失败: " + res.error, "error");
    }
  };

  // Manual door lock control
  const handleDoorLock = async (lock: boolean) => {
    setIsLockControlling(true);
    try {
      const res = await api.sendDeviceCommand("door01", { locked: lock });
      if (res.success) {
        toast(lock ? "门锁已锁定" : "门锁已解锁", "success");
      } else {
        toast("操作失败: " + res.error, "error");
      }
    } catch (err: any) {
      toast("操作失败: " + err.message, "error");
    }
    setIsLockControlling(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-base font-sans font-medium text-gray-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-500" />
            AI 人脸识别门禁系统
          </h2>
          <p className="text-xs text-gray-500 mt-1">支持实时特征比对、陌生人预警、门禁极速通关与人员人脸底片管理。</p>
        </div>

        {/* Tabs switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("verify")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition duration-150 flex items-center gap-1.5 ${
              activeTab === "verify"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            门禁验证
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition duration-150 flex items-center gap-1.5 ${
              activeTab === "library"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
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
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center justify-between">
                <span>1. 输入待验证的人脸照片</span>
                <span className="text-[10px] text-gray-400 font-mono">SUPPORT DROP, CLICK & PASTE (Ctrl+V)</span>
              </h3>

              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition ${
                  queryImage
                    ? "border-gray-300 bg-gray-50"
                    : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
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
                    <div className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-gray-200 transition shadow-sm">
                      更改照片
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600">拖拽、点击或使用 Ctrl+V 粘贴人脸图片</p>
                      <p className="text-[10px] text-gray-400 mt-1">支持 JPG, PNG, WEBP 格式</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Testing Scenarios */}
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="text-xs text-gray-500 font-medium mb-3 flex items-center justify-between">
                  <span>场景测试快捷方式</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    无需上传，点击直接跑真接口
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleVerify("pass")}
                    disabled={isVerifying}
                    className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    模拟通过
                  </button>
                  <button
                    onClick={() => handleVerify("reject")}
                    disabled={isVerifying}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    模拟拒绝
                  </button>
                  <button
                    onClick={() => handleVerify("no_face")}
                    disabled={isVerifying}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
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
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
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
                    className="px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-xl text-xs font-medium transition"
                  >
                    重置
                  </button>
                </div>
              )}
            </div>

            {/* Recent 5 Records */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center justify-between">
                <span>最近门禁核验记录 (5次)</span>
                <span className="text-[10px] text-gray-400 font-mono">Real-time Records</span>
              </h3>

              <div className="space-y-3">
                {verifyHistory.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => onOpenLightbox(rec.image, "核验抓拍图")}
                        className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden cursor-pointer"
                      >
                        <img src={rec.image} alt="capture" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">
                            {rec.status === "pass" ? rec.name : rec.status === "reject" ? "陌生人访客" : "无有效人脸"}
                          </span>
                          <span
                            className={`px-1 text-[9px] font-medium border rounded ${
                              rec.status === "pass"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : rec.status === "reject"
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-gray-100 border-gray-200 text-gray-500"
                            }`}
                          >
                            {rec.status === "pass" ? "认证成功" : rec.status === "reject" ? "访客拒绝" : "无人脸"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{rec.message}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-gray-400 block">
                        {new Date(rec.timestamp).toLocaleTimeString("zh-CN")}
                      </span>
                      {rec.status !== "no_face" && (
                        <span className="text-[10px] font-mono font-medium text-indigo-600 mt-1 block">
                          相似度 {Math.round(rec.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {verifyHistory.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-xs italic">
                    暂无本会话核验数据。你可以上传或点击模拟场景启动核验。
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right panel: Live inference result (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[15rem] flex flex-col">
              <h3 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3 mb-6 flex items-center justify-between">
                <span>比对结果与联动控制</span>
                <span className="text-[10px] text-gray-400 font-mono">INTELLIGENT DECISIONS</span>
              </h3>

              {isVerifying ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600">InsightFace 人脸特征提取中...</h4>
                    <p className="text-[10px] text-gray-400 mt-1">提取人脸五官特征，进行全局特征关联比对</p>
                  </div>
                </div>
              ) : verifyResult ? (
                <div className="flex-1 flex flex-col justify-between space-y-6 animate-fade-in">
                  
                  {/* Result Header */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      verifyResult.status === "pass"
                        ? "bg-emerald-100 border border-emerald-300 text-emerald-600"
                        : verifyResult.status === "reject"
                        ? "bg-rose-100 border border-rose-300 text-rose-600"
                        : "bg-gray-100 border border-gray-200 text-gray-500"
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
                            ? "text-emerald-600"
                            : verifyResult.status === "reject"
                            ? "text-rose-600"
                            : "text-gray-500"
                        }`}>
                          {verifyResult.status === "pass" ? "比对一致 • 允许通行" : verifyResult.status === "reject" ? "陌生人 • 拒绝通行" : "未检出人脸"}
                        </h4>
                        <span className="text-xs font-mono text-gray-400">
                          {Math.round(verifyResult.confidence * 100)}% 相似
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">{verifyResult.message}</p>
                    </div>
                  </div>

                  {/* Device automation details */}
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
                    <div className="text-xs text-gray-500 font-semibold">门禁联动执行记录:</div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-400">执行动作</span>
                      <span className={`${verifyResult.status === "pass" ? "text-emerald-600" : "text-gray-400"}`}>
                        {verifyResult.status === "pass" ? "防盗门锁已释放 (解锁5秒)" : "门锁锁定"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium border-t border-gray-200 pt-2.5">
                      <span className="text-gray-400">门锁组件动画</span>
                      <button
                        onClick={() => handleDoorLock(verifyResult.status !== "pass")}
                        disabled={isLockControlling}
                        className={`flex items-center gap-1 font-semibold text-gray-600 hover:text-indigo-600 transition disabled:opacity-50`}
                      >
                        {verifyResult.status === "pass" ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600">解锁状态</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-rose-600">锁定状态</span>
                          </>
                        )}
                        <span className="text-[10px] text-gray-400 ml-1">(点击切换)</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual lock/unlock buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleDoorLock(false)}
                      disabled={isLockControlling}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      手动解锁
                    </button>
                    <button
                      onClick={() => handleDoorLock(true)}
                      disabled={isLockControlling}
                      className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      手动上锁
                    </button>
                  </div>

                  {/* Note info */}
                  <div className="text-[10px] text-gray-400">
                    * 人脸验证成功后，系统会全自动发出微服务设备指令，开启动态户型图中的防盗门锁，并安全记入操作日志。
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <Camera className="w-8 h-8 text-gray-300 mb-3" />
                  <p className="text-xs text-gray-500">等待提交人脸验证申请</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mt-1">
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
            <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              注册授权人脸图册 ({libraryData.reduce((acc, curr) => acc + curr.faces.length, 0)} 张底图)
            </div>
            
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              注册新底片
            </button>
          </div>

          {/* Library Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {libraryData && libraryData.length > 0 ? (
              libraryData.map((item) => (
                <div key={item.person.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
                  
                  {/* Person banner */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{item.person.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          item.person.role === "owner"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : item.person.role === "family"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-gray-100 border-gray-200 text-gray-500"
                        }`}>
                          {item.person.role === "owner" ? "户主" : item.person.role === "family" ? "家人" : "访客"}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{item.person.phone || "无电话"}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-1 border border-gray-200 rounded-lg">
                      底图: {item.faces.length} 张
                    </span>
                  </div>

                  {/* Face thumbnails list for this person */}
                  <div className="grid grid-cols-3 gap-3">
                    {item.faces.length > 0 ? (
                      item.faces.map((face) => (
                        <div key={face.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img src={face.image} alt="face photo" className="w-full h-full object-cover" />
                          
                          {/* Overlay delete and zoom */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            <button
                              onClick={() => onOpenLightbox(face.image, `${item.person.name} 的人脸底片`)}
                              className="p-1 rounded bg-white/90 hover:bg-white text-gray-700"
                              title="查看大图"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFace(face.id)}
                              className="p-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-600 border border-rose-200"
                              title="删除底片"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-4 text-gray-400 text-xs">暂无人脸底片</div>
                    )}
                    {/* Fast add button thumbnail */}
                    <div
                      onClick={() => {
                        setEnrollPersonId(String(item.person.id));
                        setShowEnrollModal(true);
                      }}
                      className="aspect-square border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition gap-1"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                      <span className="text-[8px] text-gray-400">追加底图</span>
                    </div>
                  </div>

                </div>
              ))
            ) : !isLoadingLibrary ? (
              <div className="col-span-3">
                <EmptyState
                  icon="Database"
                  title="人脸库暂无底片"
                  description="系统未录入任何人员人脸。请在人员管理录入人员，或点击右上角直接为此系统用户追加第一张面部底片。"
                  actionLabel="注册新底片"
                  onAction={() => setShowEnrollModal(true)}
                />
              </div>
            ) : (
              <div className="col-span-3 text-center py-12 text-gray-400">加载中...</div>
            )}
          </div>
        </div>
      )}

      {/* Enroll Face Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-500" />
                注册关联人脸底图
              </h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollImage(null);
                  setEnrollPersonId("");
                }}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                关闭
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              
              {/* Select Person */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">1. 选择注册目标人员 (必填)</label>
                <select
                  value={enrollPersonId}
                  onChange={(e) => setEnrollPersonId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
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
                  <span className="text-[10px] text-rose-600 block">系统暂无人员，请先在人员管理添加人员！</span>
                )}
              </div>

              {/* Upload image zone */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">2. 上传面部正视原图</label>
                
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, true)}
                  onClick={() => enrollFileInputRef.current?.click()}
                  className="aspect-video rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer flex flex-col items-center justify-center relative p-4 transition"
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
                      <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">点击或拖入照片底片</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">请确保人脸清晰无遮挡</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  disabled={isEnrolling || !enrollImage || !enrollPersonId}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
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
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-medium transition"
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
