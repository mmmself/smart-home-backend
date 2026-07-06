"""
模型离线化下载脚本
一次性拉齐所有 AI 模型权重到本地目录，部署包自带全部模型，板子上零联网。

用法:
  python scripts/download_models.py

下载内容:
  - YOLOv8n → models/yolov8n.pt
  - InsightFace buffalo_l → models/insightface/
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import YOLO_MODEL_PATH, INSIGHTFACE_ROOT, INSIGHTFACE_NAME

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
INSIGHTFACE_DIR = INSIGHTFACE_ROOT if os.path.isabs(INSIGHTFACE_ROOT) else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), INSIGHTFACE_ROOT)


def download_yolo():
    dest = YOLO_MODEL_PATH if os.path.isabs(YOLO_MODEL_PATH) else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), YOLO_MODEL_PATH)
    if os.path.exists(dest):
        print(f"[YOLO] 已存在: {dest} ({os.path.getsize(dest) // 1024 // 1024}MB)")
        return
    print("[YOLO] 正在下载 YOLOv8n...")
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    print(f"[YOLO] 下载完成: {dest}")


def download_insightface():
    os.makedirs(INSIGHTFACE_DIR, exist_ok=True)
    print(f"[InsightFace] 目标目录: {INSIGHTFACE_DIR}")
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name=INSIGHTFACE_NAME, root=INSIGHTFACE_DIR, providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(640, 640))
    print(f"[InsightFace] 模型已缓存到: {INSIGHTFACE_DIR}")


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    print("=" * 50)
    print("模型离线化下载")
    print("=" * 50)

    try:
        download_yolo()
    except Exception as e:
        print(f"[YOLO] 下载失败: {e}")

    try:
        download_insightface()
    except Exception as e:
        print(f"[InsightFace] 下载失败: {e}")

    print("=" * 50)
    print("完成。请确认 models/ 目录下的文件已就绪。")


if __name__ == "__main__":
    main()
