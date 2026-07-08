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
import * as api from "../api";

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
    const res = await api.getDetections({ limit: 12 });
    if (res.success && res.data) {
      setHistoryDetections(res.data as any);
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

  // Submit for Object Detection (YOLO Inference)
  const handleDetect = async () => {
    if (!queryImage) {
      toast("请先上传或粘贴一张待识别的图片", "error");
      return;
    }

    setIsInferring(true);
    setActiveDetection(null);

    // Convert base64 to File
    let file: File | null = null;
    if (queryImage.startsWith('data:')) {
      const res = await fetch(queryImage);
      const blob = await res.blob();
      file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    }

    if (!file) {
      toast("图片格式错误", "error");
      setIsInferring(false);
      return;
    }

    const json = await api.detectObjects(file, isLinkageEnabled);
    if (json.success && json.data) {
      setActiveDetection({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        originalImage: queryImage,
        annotatedImage: json.data.annotated_url || queryImage,
        results: (json.data.detections || []).map((d: any) => ({
          category: d.cls,
          category_zh: d.cls,
          confidence: d.conf,
          bbox: d.bbox,
        })),
      } as any);
      toast(`识别完成：检出 ${(json.data.detections || []).length} 个特征目标！`, "success");
      if (json.data.linkageTriggered) {
        toast("智能联动触发：客厅主灯已调至 100% 亮度！", "success");
        refreshDevices();
      }
      fetchDetections();
    } else {
      toast("识别失败: " + json.error, "error");
    }
    setIsInferring(false);
  };

  // Select item from history to load into active preview
  const handleLoadHistory = (det: Detection) => {
    setQueryImage(det.originalImage);
    setActiveDetection(det);
    toast("已加载历史识别数据", "success");
  };

  // Bounding box colors generator helper
  const boxColors = [
    "border-indigo-500 text-indigo-600 bg-indigo-50",
    "border-amber-500 text-amber-600 bg-amber-50",
    "border-emerald-500 text-emerald-600 bg-emerald-50",
    "border-pink-500 text-pink-600 bg-pink-50",
    "border-cyan-500 text-cyan-600 bg-cyan-50",
    "border-rose-500 text-rose-600 bg-rose-50",
  ];

  const getConfColor = (conf: number) => {
    if (conf >= 0.7) return "bg-emerald-500";
    if (conf >= 0.4) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getConfTextColor = (conf: number) => {
    if (conf >= 0.7) return "text-emerald-600 bg-emerald-100 border-emerald-200";
    if (conf >= 0.4) return "text-amber-600 bg-amber-100 border-amber-200";
    return "text-rose-600 bg-rose-100 border-rose-200";
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-base font-sans font-medium text-gray-800 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500 animate-pulse" />
            YOLO 实时物体分类与空间识别
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            高维度多类别识别（人员、宠物、大件、工具）。配置联动条件，检测到预警实体时自动联动家居。
          </p>
        </div>

        {/* Linkage switch toggle */}
        <div className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-xl border border-gray-200">
          <Lightbulb className={`w-4 h-4 ${isLinkageEnabled ? "text-amber-500" : "text-gray-400"}`} />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-semibold text-gray-600">防盗自动联动开灯</span>
            <span className="text-[8px] text-gray-400">检测到「人员」自动点亮客厅</span>
          </div>
          <button
            onClick={() => setIsLinkageEnabled(!isLinkageEnabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ml-2 ${
              isLinkageEnabled ? "bg-indigo-600" : "bg-gray-300"
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
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase font-mono tracking-wider">
                Inference sandbox
              </h3>
              <span className="text-[10px] text-gray-400">PASTE IMAGES AT ANY TIME</span>
            </div>

            {/* Graphic canvas */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-[4/3] rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center p-2 text-center cursor-pointer transition ${
                queryImage
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
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
                  {activeDetection && (activeDetection.results || []).map((res, i) => {
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
                        <div className="absolute -top-5 left-0 px-1 py-0.5 rounded text-[9px] font-bold bg-white/90 flex items-center gap-1 border border-gray-200 shadow whitespace-nowrap">
                          <span>{res.category_zh}</span>
                          <span className="opacity-70 text-[8px] font-mono">{Math.round(res.confidence * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Skeleton Overlay when Inferring */}
                  {isInferring && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 space-y-4">
                      {/* Laser scanner effect animation */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[bounce_2s_infinite]" />
                      
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                      <div>
                        <h4 className="text-xs font-semibold text-indigo-600 flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          YOLO 视觉深度感知引擎处理中...
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-xs">
                          提取图片色调与二维矩阵，检索分类对象并精确逼近多边形框位置坐标。
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fast visual zoom option on hover */}
                  {!isInferring && !activeDetection && (
                    <div className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-gray-200 transition pointer-events-auto shadow-sm" onClick={() => fileInputRef.current?.click()}>
                      更换图片
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-6 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
                    <UploadCloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600">拖拽、点击选择或直接 Ctrl+V 粘贴任何实物图</p>
                    <p className="text-[10px] text-gray-400 mt-1">支持常见监控截图、人员快照或任意物体图片</p>
                  </div>
                </div>
              )}
            </div>

            {/* Run active classification */}
            {queryImage && !isInferring && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleDetect}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  提交流程：空间智能物体识别
                </button>
                <button
                  onClick={() => {
                    setQueryImage(null);
                    setActiveDetection(null);
                  }}
                  className="px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-xl text-xs font-medium transition"
                >
                  清除
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Inference Table Results (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[15rem] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase font-mono tracking-wider">
                Detection results
              </h3>
              <span className="text-[10px] text-gray-400">COORDINATE MAPPING TABLE</span>
            </div>

            {isInferring ? (
              <div className="flex-1 flex flex-col justify-center space-y-3 py-12">
                {/* Skeleton placeholders */}
                <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 animate-pulse" style={{ animationDelay: "150ms" }} />
                <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            ) : activeDetection ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                
                {/* Table list */}
                <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                  
                  <div className="grid grid-cols-12 text-[10px] text-gray-400 font-bold px-3 pb-1.5 border-b border-gray-200">
                    <span className="col-span-5">类别 (ZH/EN)</span>
                    <span className="col-span-4">置信度比例</span>
                    <span className="col-span-3 text-right">框选坐标比例</span>
                  </div>

                  {(activeDetection.results || []).map((res, i) => {
                    const colorIndex = i % boxColors.length;
                    const cIndicator = boxColors[colorIndex].split(" ")[0]; // border-... color

                    const [ymin, xmin, ymax, xmax] = res.bbox;

                    return (
                      <div
                        key={i}
                        className="grid grid-cols-12 items-center text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition duration-150"
                      >
                        {/* Cat */}
                        <div className="col-span-5 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border ${cIndicator}`} />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-gray-700 text-[11px]">{res.category_zh}</span>
                            <span className="text-[9px] text-gray-400 uppercase font-mono">{res.category}</span>
                          </div>
                        </div>

                        {/* Confidence indicator progress */}
                        <div className="col-span-4 pr-2 space-y-1 text-left">
                          <div className="flex items-center gap-1">
                            <span className={`px-1 rounded text-[8px] font-semibold border ${getConfTextColor(res.confidence)}`}>
                              {Math.round(res.confidence * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${res.confidence * 100}%` }}
                              className={`h-full rounded-full ${getConfColor(res.confidence)}`}
                            />
                          </div>
                        </div>

                        {/* Coordinates array */}
                        <span className="col-span-3 text-right font-mono text-[10px] text-gray-500">
                          [{xmin}, {ymin}, {xmax}, {ymax}]
                        </span>

                      </div>
                    );
                  })}

                  {(!activeDetection.results || activeDetection.results.length === 0) && (
                    <div className="text-center py-12 text-gray-400 text-xs italic">
                      未发现明显的特征实体或可识别物品。
                    </div>
                  )}

                </div>

                {/* Footnote */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[10px] text-gray-500 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-600 block">坐标解释说明:</span>
                    框选百分比 [x1, y1, x2, y2] 顺次代表左上角水平百分比、垂直百分比、右下角水平百分比、垂直百分比。
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                <Layers className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-xs text-gray-500">等待提交物体检测</p>
                <p className="text-[10px] text-gray-400 max-w-xs mt-1">
                  上传图片并提交流程，YOLO 会提供高精度包围盒并在右侧绘制多边形目标分类。
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 4. Bottom History Carousel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center justify-between">
          <span>历史识别快照记录 ({historyDetections.length})</span>
          <span className="text-[10px] text-gray-400 font-mono">Horizontal Scroll View</span>
        </h3>

        {/* Carousel items wrapper */}
        <div className="flex gap-4 overflow-x-auto pb-3 pr-1 pt-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {historyDetections.map((det) => (
            <div
              key={det.id}
              onClick={() => handleLoadHistory(det)}
              className="flex-shrink-0 w-44 bg-gray-50 border border-gray-200 hover:border-indigo-300 p-2.5 rounded-xl cursor-pointer hover:shadow-md transition duration-200 group"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                <img src={det.originalImage} alt="history snap" className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] bg-indigo-600 font-bold text-white shadow">
                  {det.results?.length || 0} 个目标
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] text-gray-500">
                <span className="font-mono">{new Date(det.timestamp).toLocaleDateString("zh-CN")}</span>
                <span>{new Date(det.timestamp).toLocaleTimeString("zh-CN")}</span>
              </div>
            </div>
          ))}

          {historyDetections.length === 0 && (
            <div className="w-full text-center py-6 text-gray-400 text-xs italic">
              暂无历史核验快照记录，请进行一次物体检测。
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
