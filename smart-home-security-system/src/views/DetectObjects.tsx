import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import { Detection } from "../types";

interface DetectObjectsProps {
  toast: (msg: string, type: "success" | "error" | "info") => void;
  onOpenLightbox: (imageUrl: string, title: string) => void;
  refreshDevices: () => void;
}

export default function DetectObjects({ toast, onOpenLightbox, refreshDevices }: DetectObjectsProps) {
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState(false);
  const [activeDetection, setActiveDetection] = useState<Detection | null>(null);
  const [historyDetections, setHistoryDetections] = useState<Detection[]>([]);
  const [isLinkageEnabled, setIsLinkageEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch detections history
  const fetchDetections = async () => {
    try {
      const res = await fetch("/api/detections");
      const json = await res.json();
      if (json.success) {
        setHistoryDetections(json.data);
      }
    } catch (err) {
      console.error("Error fetching object detections history:", err);
    }
  };

  useEffect(() => {
    fetchDetections();
  }, []);

  // Global Ctrl+V clipboard image paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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
                setActiveDetection(null);
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
  }, []);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setQueryImage(event.target.result as string);
          setActiveDetection(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setQueryImage(event.target.result as string);
          setActiveDetection(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit for Object Detection (YOLO Inference simulation/real API)
  const handleDetect = async () => {
    if (!queryImage) {
      toast("请先上传或粘贴一张待识别的图片", "error");
      return;
    }

    setIsInferring(true);
    setActiveDetection(null);

    try {
      const res = await fetch("/api/detect?linkage=" + (isLinkageEnabled ? "1" : "0"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: queryImage,
          linkage: isLinkageEnabled,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActiveDetection(json.data);
        toast(`识别完成：检出 ${json.data.results.length} 个特征目标！`, "success");
        if (json.linkageTriggered) {
          toast("智能联动触发：客厅主灯已调至 100% 亮度！", "success");
          refreshDevices(); // Refresh global device state in parent
        }
        fetchDetections(); // Refresh bottom history
      } else {
        toast("识别失败: " + json.error, "error");
      }
    } catch (err) {
      toast("视觉处理引擎调用异常", "error");
    } finally {
      setIsInferring(false);
    }
  };

  // Select item from history to load into active preview
  const handleLoadHistory = (det: Detection) => {
    setQueryImage(det.originalImage);
    setActiveDetection(det);
    toast("已加载历史识别数据", "success");
  };

  // Bounding box colors generator helper
  const boxColors = [
    "border-indigo-500 text-indigo-400 bg-indigo-500/10",
    "border-amber-500 text-amber-400 bg-amber-500/10",
    "border-emerald-500 text-emerald-400 bg-emerald-500/10",
    "border-pink-500 text-pink-400 bg-pink-500/10",
    "border-cyan-500 text-cyan-400 bg-cyan-500/10",
    "border-rose-500 text-rose-400 bg-rose-500/10",
  ];

  const getConfColor = (conf: number) => {
    if (conf >= 0.7) return "bg-emerald-500";
    if (conf >= 0.4) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getConfTextColor = (conf: number) => {
    if (conf >= 0.7) return "text-emerald-400 bg-emerald-950/40 border-emerald-900/30";
    if (conf >= 0.4) return "text-amber-400 bg-amber-950/40 border-amber-900/30";
    return "text-rose-400 bg-rose-950/40 border-rose-900/30";
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <div>
          <h2 className="text-base font-sans font-medium text-zinc-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400 animate-pulse" />
            YOLO 实时物体分类与空间识别
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            高维度多类别识别（人员、宠物、大件、工具）。配置联动条件，检测到预警实体时自动联动家居。
          </p>
        </div>

        {/* Linkage switch toggle */}
        <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
          <Lightbulb className={`w-4 h-4 ${isLinkageEnabled ? "text-amber-400" : "text-zinc-600"}`} />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-semibold text-zinc-300">防盗自动联动开灯</span>
            <span className="text-[8px] text-zinc-500">检测到「人员」自动点亮客厅</span>
          </div>
          <button
            onClick={() => setIsLinkageEnabled(!isLinkageEnabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ml-2 ${
              isLinkageEnabled ? "bg-indigo-600" : "bg-zinc-800"
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
              isLinkageEnabled ? "translate-x-4" : ""
            }`} />
          </button>
        </div>
      </div>

      {/* Main Vision Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Upload & Graphic Sandbox (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase font-mono tracking-wider">
                Inference sandbox
              </h3>
              <span className="text-[10px] text-zinc-500">PASTE IMAGES AT ANY TIME</span>
            </div>

            {/* Graphic canvas */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-[4/3] rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center p-2 text-center cursor-pointer transition ${
                queryImage
                  ? "border-zinc-800 bg-zinc-950"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/25 hover:bg-zinc-950/40"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {queryImage ? (
                <div className="relative w-full h-full flex items-center justify-center select-none" onClick={(e) => e.stopPropagation()}>
                  {/* Original image */}
                  <img
                    src={queryImage}
                    alt="Target source"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />

                  {/* Absolute positioning of bounding boxes */}
                  {activeDetection && activeDetection.results.map((res, i) => {
                    const [ymin, xmin, ymax, xmax] = res.bbox;
                    const style = {
                      top: `${ymin}%`,
                      left: `${xmin}%`,
                      height: `${ymax - ymin}%`,
                      width: `${xmax - xmin}%`,
                    };

                    const styleIndex = i % boxColors.length;

                    return (
                      <div
                        key={i}
                        style={style}
                        className={`absolute border-2 rounded transition-all duration-150 ${boxColors[styleIndex]} group/box`}
                      >
                        {/* Label tag above bounding box */}
                        <div className="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-bold bg-black/80 flex items-center gap-1 border border-zinc-850 shadow whitespace-nowrap">
                          <span>{res.category_zh}</span>
                          <span className="opacity-70 text-[8px] font-mono">{Math.round(res.confidence * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Skeleton Overlay when Inferring */}
                  {isInferring && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 space-y-4">
                      {/* Laser scanner effect animation */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[bounce_2s_infinite]" />
                      
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                      <div>
                        <h4 className="text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          Gemini 视觉深度感知引擎处理中...
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">
                          提取图片色调与二维矩阵，检索分类对象并精确逼近多边形框位置坐标。
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fast visual zoom option on hover */}
                  {!isInferring && !activeDetection && (
                    <div className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-zinc-800 transition pointer-events-auto" onClick={() => fileInputRef.current?.click()}>
                      更换图片
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-6 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 mx-auto">
                    <UploadCloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">拖拽、点击选择或直接 Ctrl+V 粘贴任何实物图</p>
                    <p className="text-[10px] text-zinc-500 mt-1">支持常见监控截图、人员快照或任意物体图片</p>
                  </div>
                </div>
              )}
            </div>

            {/* Run active classification */}
            {queryImage && !isInferring && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleDetect}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-950/40"
                >
                  <Sparkles className="w-4 h-4" />
                  提交流程：空间智能物体识别
                </button>
                <button
                  onClick={() => {
                    setQueryImage(null);
                    setActiveDetection(null);
                  }}
                  className="px-4 py-3 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-300 rounded-xl text-xs font-medium transition"
                >
                  清除
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Inference Table Results (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 backdrop-blur-md min-h-[15rem] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase font-mono tracking-wider">
                Detection results
              </h3>
              <span className="text-[10px] text-zinc-500">COORDINATE MAPPING TABLE</span>
            </div>

            {isInferring ? (
              <div className="flex-1 flex flex-col justify-center space-y-3 py-12">
                {/* Skeleton placeholders */}
                <div className="h-10 bg-zinc-950/40 rounded-xl border border-zinc-900 animate-pulse" />
                <div className="h-10 bg-zinc-950/40 rounded-xl border border-zinc-900 animate-pulse" style={{ animationDelay: "150ms" }} />
                <div className="h-10 bg-zinc-950/40 rounded-xl border border-zinc-900 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            ) : activeDetection ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                
                {/* Table list */}
                <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                  
                  <div className="grid grid-cols-12 text-[10px] text-zinc-500 font-bold px-3 pb-1.5 border-b border-zinc-850">
                    <span className="col-span-5">类别 (ZH/EN)</span>
                    <span className="col-span-4">置信度比例</span>
                    <span className="col-span-3 text-right">框选坐标比例</span>
                  </div>

                  {activeDetection.results.map((res, i) => {
                    const colorIndex = i % boxColors.length;
                    const cIndicator = boxColors[colorIndex].split(" ")[0]; // border-... color

                    const [ymin, xmin, ymax, xmax] = res.bbox;

                    return (
                      <div
                        key={i}
                        className="grid grid-cols-12 items-center text-xs p-2.5 rounded-xl border border-zinc-850/60 bg-zinc-950/40 hover:bg-zinc-950 transition duration-150"
                      >
                        {/* Cat */}
                        <div className="col-span-5 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border ${cIndicator}`} />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-zinc-200 text-[11px]">{res.category_zh}</span>
                            <span className="text-[9px] text-zinc-500 uppercase font-mono">{res.category}</span>
                          </div>
                        </div>

                        {/* Confidence indicator progress */}
                        <div className="col-span-4 pr-2 space-y-1 text-left">
                          <div className="flex items-center gap-1">
                            <span className={`px-1 rounded text-[8px] font-semibold border ${getConfTextColor(res.confidence)}`}>
                              {Math.round(res.confidence * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${res.confidence * 100}%` }}
                              className={`h-full rounded-full ${getConfColor(res.confidence)}`}
                            />
                          </div>
                        </div>

                        {/* Coordinates array */}
                        <span className="col-span-3 text-right font-mono text-[10px] text-zinc-400">
                          [{xmin}, {ymin}, {xmax}, {ymax}]
                        </span>

                      </div>
                    );
                  })}

                  {activeDetection.results.length === 0 && (
                    <div className="text-center py-12 text-zinc-500 text-xs italic">
                      未发现明显的特征实体或可识别物品。
                    </div>
                  )}

                </div>

                {/* Footnote */}
                <div className="bg-zinc-950/30 border border-zinc-850/80 rounded-xl p-3 text-[10px] text-zinc-500 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-400 block">坐标解释说明:</span>
                    框选百分比 [x1, y1, x2, y2] 顺次代表左上角水平百分比、垂直百分比、右下角水平百分比、垂直百分比。
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10">
                <Layers className="w-8 h-8 text-zinc-600 mb-3" />
                <p className="text-xs text-zinc-400">等待提交物体检测</p>
                <p className="text-[10px] text-zinc-600 max-w-xs mt-1">
                  上传图片并提交流程，Gemini 会提供高精度包围盒并在右侧绘制多边形目标分类。
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 4. Bottom History Carousel */}
      <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
        <h3 className="text-sm font-medium text-zinc-200 mb-4 flex items-center justify-between">
          <span>历史识别快照记录 ({historyDetections.length})</span>
          <span className="text-[10px] text-zinc-500 font-mono">Horizontal Scroll View</span>
        </h3>

        {/* Carousel items wrapper */}
        <div className="flex gap-4 overflow-x-auto pb-3 pr-1 pt-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {historyDetections.map((det) => (
            <div
              key={det.id}
              onClick={() => handleLoadHistory(det)}
              className="flex-shrink-0 w-44 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-xl cursor-pointer hover:shadow-lg transition duration-200 group"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-850">
                <img src={det.originalImage} alt="history snap" className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] bg-indigo-600 font-bold text-white shadow">
                  {det.results.length} 个目标
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-500">
                <span className="font-mono">{new Date(det.timestamp).toLocaleDateString("zh-CN")}</span>
                <span>{new Date(det.timestamp).toLocaleTimeString("zh-CN")}</span>
              </div>
            </div>
          ))}

          {historyDetections.length === 0 && (
            <div className="w-full text-center py-6 text-zinc-600 text-xs italic">
              暂无历史核验快照记录，请进行一次物体检测。
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
