import { useState } from "react";
import { Camera, RefreshCw, Check, X } from "lucide-react";
import { captureFromBackend } from "../api";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraCapture({ onCapture, onClose, title = "摄像头拍照" }: CameraCaptureProps) {
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShoot = async () => {
    setIsCapturing(true);
    setError("");
    const res = await captureFromBackend();
    if (res.success && res.data) {
      setCaptured(res.data);
    } else {
      setError(res.error || "拍照失败");
    }
    setIsCapturing(false);
  };

  const handleRetake = () => {
    setCaptured(null);
    setError("");
  };

  const handleConfirm = () => {
    if (captured) {
      onCapture(captured);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-500" />
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error ? (
            <div className="aspect-video flex flex-col items-center justify-center text-center bg-gray-50 rounded-xl border border-gray-200">
              <X className="w-8 h-8 text-rose-400 mb-2" />
              <p className="text-xs text-gray-500 px-6">{error}</p>
            </div>
          ) : captured ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <img src={captured} alt="captured" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center text-white/60">
              {isCapturing ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs">正在拍照...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 mb-2 text-white/40" />
                  <span className="text-xs">点击下方"拍照"按钮采集画面</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-5 pb-5">
          {!captured && !error && (
            <button
              onClick={handleShoot}
              disabled={isCapturing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <Camera className="w-4 h-4" />
              拍照
            </button>
          )}
          {captured && (
            <>
              <button
                onClick={handleRetake}
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium flex items-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                重拍
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
              >
                <Check className="w-4 h-4" />
                确认使用
              </button>
            </>
          )}
          {error && (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
