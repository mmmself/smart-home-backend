import cv2
import glob
import numpy as np
import logging
import threading
from ..config import (
    CAMERA_GAMMA,
    CAMERA_WARMTH,
    CAMERA_CONTRAST,
)

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_cap = None
_thread = None
_running = False
_latest_frame = None
_frame_lock = threading.Lock()


def _build_gamma_lut(gamma):
    inv = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv) * 255 for i in range(256)], dtype=np.uint8)
    return table


_GAMMA_LUT = _build_gamma_lut(1.5)


def _enhance_frame(frame):
    out = cv2.LUT(frame, _GAMMA_LUT)
    out = cv2.convertScaleAbs(out, alpha=CAMERA_CONTRAST, beta=0)
    out = cv2.fastNlMeansDenoisingColored(out, None, h=7, hColor=7, templateWindowSize=7, searchWindowSize=21)
    return out


def _reader_loop():
    global _latest_frame
    while _running:
        ret, frame = _cap.read()
        if not ret:
            continue
        with _frame_lock:
            _latest_frame = frame


def _find_camera():
    devices = sorted(glob.glob("/dev/video*"), key=lambda d: int(d.replace("/dev/video", "")))
    for dev in devices:
        idx = int(dev.replace("/dev/video", ""))
        cap = cv2.VideoCapture(idx)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                logger.info(f"找到可用摄像头: {dev} (index={idx})")
                return cap
            cap.release()
        else:
            cap.release()
    return None


def init_camera():
    global _cap, _thread, _running
    with _lock:
        if _cap is not None:
            return
        _cap = _find_camera()
        if _cap is None:
            logger.warning("未找到可用摄像头")
            return
        _cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        logger.info("摄像头已打开")
        _running = True
        _thread = threading.Thread(target=_reader_loop, daemon=True)
        _thread.start()


def release_camera():
    global _cap, _thread, _running, _latest_frame
    with _lock:
        _running = False
        if _thread is not None:
            _thread.join(timeout=2)
            _thread = None
        if _cap is not None:
            _cap.release()
            _cap = None
        with _frame_lock:
            _latest_frame = None
        logger.info("摄像头已释放")


def get_jpeg_bytes():
    if _cap is None:
        init_camera()
        if _cap is None:
            return None
    with _frame_lock:
        frame = _latest_frame.copy() if _latest_frame is not None else None
    if frame is None:
        import time
        time.sleep(0.5)
        with _frame_lock:
            frame = _latest_frame.copy() if _latest_frame is not None else None
        if frame is None:
            return None
    frame = _enhance_frame(frame)
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        return None
    return buf.tobytes()
