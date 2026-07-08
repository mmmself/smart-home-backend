import cv2
import os

from ..config import YOLO_MODEL_PATH

_yolo_model = None


def _get_model():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        if os.path.exists(YOLO_MODEL_PATH):
            _yolo_model = YOLO(YOLO_MODEL_PATH)
        else:
            _yolo_model = YOLO("yolov8n.pt")
    return _yolo_model


def detect(image_path: str):
    model = _get_model()
    results = model.predict(image_path, conf=0.4)
    r = results[0]
    annotated = r.plot()
    annotated_path = image_path.rsplit(".", 1)[0] + "_annotated.jpg"
    cv2.imwrite(annotated_path, annotated)
    dets = [{"cls": model.names[int(b.cls)], "conf": float(b.conf), "box": b.xyxy[0].tolist()}
            for b in r.boxes]
    return annotated_path, dets
