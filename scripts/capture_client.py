"""
摄像头采集客户端
从摄像头定时/触发拍照，直接从内存 POST 到后端 /api/detect 或 /api/face/verify。
照片由后端统一存盘，客户端不做本地存储。

用法:
  python scripts/capture_client.py --mode detect --interval 10
  python scripts/capture_client.py --mode verify --once
  python scripts/capture_client.py --mode detect --device 0 --interval 5

环境变量(.env):
  CAPTURE_DEVICE  摄像头设备号 (默认 0)
  BACKEND_URL     后端地址 (默认 http://localhost:8000)
  API_KEY         后端 API key (与后端 .env 中 API_KEY 一致，留空则不发送)
  CAMERA_EXPOSURE      曝光补偿 (默认 0.25, 多数摄像头需关闭自动曝光才生效)
  CAMERA_BRIGHTNESS    亮度 (默认 128, 0-255)
  CAMERA_AUTO_EXPOSURE 自动曝光 (默认 0.75=手动模式, 以便手动曝光生效)
  CAMERA_AUTO_WB       自动白平衡 (默认 0=关闭, 以便手动暖白平衡生效)
  CAMERA_WB_TEMP       白平衡色温 (默认 4500, 偏暖)
  CAMERA_GAMMA         后处理 gamma 提亮 (默认 1.35, >1 提亮)
  CAMERA_WARMTH        后处理暖色调强度 (默认 14, 增强 R 削弱 B)
"""

import io
import os
import sys
import time
import argparse
import requests
import cv2
import numpy as np
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
API_KEY = os.getenv("API_KEY", "")
DEFAULT_DEVICE = int(os.getenv("CAPTURE_DEVICE", "0"))

CAMERA_EXPOSURE = float(os.getenv("CAMERA_EXPOSURE", "0.25"))
CAMERA_BRIGHTNESS = float(os.getenv("CAMERA_BRIGHTNESS", "128"))
CAMERA_AUTO_EXPOSURE = float(os.getenv("CAMERA_AUTO_EXPOSURE", "0.75"))
CAMERA_AUTO_WB = float(os.getenv("CAMERA_AUTO_WB", "0"))
CAMERA_WB_TEMP = float(os.getenv("CAMERA_WB_TEMP", "4500"))
CAMERA_GAMMA = float(os.getenv("CAMERA_GAMMA", "1.35"))
CAMERA_WARMTH = int(os.getenv("CAMERA_WARMTH", "14"))


def apply_camera_settings(cap):
    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, CAMERA_AUTO_EXPOSURE)
    cap.set(cv2.CAP_PROP_EXPOSURE, CAMERA_EXPOSURE)
    cap.set(cv2.CAP_PROP_BRIGHTNESS, CAMERA_BRIGHTNESS)
    cap.set(cv2.CAP_PROP_AUTO_WB, CAMERA_AUTO_WB)
    cap.set(cv2.CAP_PROP_WB_TEMPERATURE, CAMERA_WB_TEMP)


def build_gamma_lut(gamma):
    inv = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv) * 255 for i in range(256)], dtype=np.uint8)
    return table


_GAMMA_LUT = build_gamma_lut(CAMERA_GAMMA)


def enhance_frame(frame):
    out = cv2.LUT(frame, _GAMMA_LUT)
    if CAMERA_WARMTH:
        b, g, r = cv2.split(out)
        r = cv2.add(r, CAMERA_WARMTH)
        b = cv2.subtract(b, CAMERA_WARMTH)
        out = cv2.merge((b, g, r))
    return out


def capture_frame(cap):
    ret, frame = cap.read()
    if not ret:
        print("拍照失败: 无法从摄像头读取画面")
        return None
    return enhance_frame(frame)


def send_frame(frame, mode):
    ok, buf = cv2.imencode(".jpg", frame)
    if not ok:
        print("编码失败: 无法将帧编码为 JPEG")
        return

    ts = time.strftime("%Y%m%d_%H%M%S")
    endpoint = f"{BACKEND_URL}/api/{'detect' if mode == 'detect' else 'face/verify'}"
    headers = {}
    if API_KEY:
        headers["X-API-Key"] = API_KEY

    try:
        files = {"file": (f"capture_{ts}.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
        resp = requests.post(endpoint, files=files, headers=headers, timeout=30)
        print(f"  -> {resp.status_code}: {resp.json()}")
    except Exception as e:
        print(f"  -> 请求失败: {e}")


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

    apply_camera_settings(cap)

    print(f"摄像头已打开 (device={args.device})")
    print(f"模式: {args.mode}, 间隔: {args.interval}s")

    try:
        while True:
            frame = capture_frame(cap)
            if frame is not None:
                send_frame(frame, args.mode)
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
