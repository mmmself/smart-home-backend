from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Detection, OpLog
from ..services.yolo_service import detect as yolo_detect
from ..schemas import resp
from ..config import TOPIC_SUFFIX
import os
import uuid
from datetime import datetime
import json

router = APIRouter(prefix="/api")


@router.post("/detect")
async def detect_image(
    file: UploadFile = File(...),
    linkage: int = Query(default=0),
    db: Session = Depends(get_db),
):
    today = datetime.now().strftime("%Y%m%d")
    upload_dir = os.path.join("backend", "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    image_url = f"/uploads/{today}/{filename}"
    annotated_path, detections = yolo_detect(filepath)
    annotated_url = annotated_path.replace("backend", "").replace("\\", "/")

    detection_record = Detection(
        image_path=image_url,
        annotated_path=annotated_url,
        result_json=json.dumps(detections),
    )
    db.add(detection_record)

    has_linkage = linkage == 1 and len(detections) > 0
    has_traffic_light = any(d["cls"] == "traffic light" for d in detections)

    if has_linkage or has_traffic_light:
        from ..models import Device
        light = db.query(Device).filter(Device.device_id == "light01").first()
        if light:
            if light.state is None:
                light.state = {}
            light.state["on"] = True
            db.add(OpLog(
                action="linkage_light_on",
                target="light01",
                operator="yolo_detection",
                detail={"detections": [d["cls"] for d in detections]},
            ))

    db.commit()

    return resp({
        "image_url": image_url,
        "annotated_url": annotated_url,
        "detections": detections,
    })
