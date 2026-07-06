"""
摄像头采集客户端
从摄像头定时/触发拍照，本地存盘后 POST 到后端 /api/detect 或 /api/face/verify。

用法:
  python scripts/capture_client.py --mode detect --interval 10
  python scripts/capture_client.py --mode verify --once
  python scripts/capture_client.py --mode detect --device 0 --interval 5

环境变量(.env):
  CAPTURE_DEVICE  摄像头设备号 (默认 0)
  BACKEND_URL     后端地址 (默认 http://localhost:8000)
  API_KEY         后端 API key (与后端 .env 中 API_KEY 一致，留空则不发送)
"""

import os
import sys
import time
import argparse
import requests
import cv2
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
API_KEY = os.getenv("API_KEY", "")
DEFAULT_DEVICE = int(os.getenv("CAPTURE_DEVICE", "0"))


def capture_frame(cap):
    ret, frame = cap.read()
    if not ret:
        print("拍照失败: 无法从摄像头读取画面")
        return None
    return frame


def save_and_send(frame, mode, tmp_dir="/tmp/capture"):
    os.makedirs(tmp_dir, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(tmp_dir, f"capture_{ts}.jpg")
    cv2.imwrite(filepath, frame)
    print(f"已保存: {filepath}")

    endpoint = f"{BACKEND_URL}/api/{'detect' if mode == 'detect' else 'face/verify'}"
    headers = {}
    if API_KEY:
        headers["X-API-Key"] = API_KEY

    try:
        with open(filepath, "rb") as f:
            files = {"file": (f"capture_{ts}.jpg", f, "image/jpeg")}
            resp = requests.post(endpoint, files=files, headers=headers, timeout=30)
        print(f"  → {resp.status_code}: {resp.json()}")
    except Exception as e:
        print(f"  → 请求失败: {e}")


def main():
    parser = argparse.ArgumentParser(description="摄像头采集客户端")
    parser.add_argument("--mode", choices=["detect", "verify"], default="detect",
                        help="采集模式: detect=目标检测, verify=人脸验证")
    parser.add_argument("--device", type=int, default=DEFAULT_DEVICE,
                        help=f"摄像头设备号 (默认 {DEFAULT_DEVICE})")
    parser.add_argument("--interval", type=int, default=10,
                        help="拍照间隔秒数 (默认 10)")
    parser.add_argument("--once", action="store_true",
                        help="只拍一次后退出")
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.device)
    if not cap.isOpened():
        print(f"无法打开摄像头 (device={args.device})")
        sys.exit(1)

    print(f"摄像头已打开 (device={args.device})")
    print(f"模式: {args.mode}, 间隔: {args.interval}s")

    try:
        while True:
            frame = capture_frame(cap)
            if frame is not None:
                save_and_send(frame, args.mode)
            if args.once:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n停止采集")
    finally:
        cap.release()
        print("摄像头已释放")


if __name__ == "__main__":
    main()
