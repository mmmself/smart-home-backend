import sys
sys.path.insert(0, ".")
from ultralytics import YOLO
m = YOLO("models/yolov8n.pt")
print(f"YOLOv8n loaded, classes: {len(m.names)}")
