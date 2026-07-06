from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Detection, OpLog
from ..services.yolo_service import detect as yolo_detect
from ..services.upload import validate_upload
from ..schemas import resp
import os
import uuid
from datetime import datetime
router = APIRouter(prefix="/api")


@router.post("/detect")
async def detect_image(
    file: UploadFile = File(...),
    linkage: int = Query(default=0),
    db: Session = Depends(get_db),
):
    today = datetime.now().strftime("%Y%m%d")
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    upload_dir = os.path.join(backend_dir, "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    content = await file.read()
    ext = validate_upload(file, content)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    image_url = f"/uploads/{today}/{filename}"
    annotated_path, detections = yolo_detect(filepath)
    annotated_filename = os.path.basename(annotated_path)
    annotated_url = f"/uploads/{today}/{annotated_filename}"

    detection_record = Detection(
        image_path=image_url,
        annotated_path=annotated_url,
        result_json=detections,
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
