from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Detection
from ..services.yolo_service import detect as yolo_detect
from ..services.device_service import apply_device_state
from ..services.upload import validate_upload
from ..schemas import resp
from ..config import LINKAGE_CLASS
import os
import uuid
from datetime import datetime
router = APIRouter(prefix="/api")


@router.post("/detect")
def detect_image(
    file: UploadFile = File(...),
    linkage: int = Query(default=1),
    db: Session = Depends(get_db),
):
    today = datetime.now().strftime("%Y%m%d")
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    upload_dir = os.path.join(backend_dir, "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    content = file.file.read()
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

    if linkage == 1 and any(d["cls"] == LINKAGE_CLASS for d in detections):
        apply_device_state(db, "light01", {"on": True},
                           action="linkage_light_on", operator="yolo_detection")

    db.commit()

    return resp({
        "image_url": image_url,
        "annotated_url": annotated_url,
        "detections": detections,
    })


@router.get("/detections")
def list_detections(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=6, ge=1, le=50),
    db: Session = Depends(get_db),
):
    q = db.query(Detection).order_by(Detection.ts.desc())
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    return resp({"total": total, "items": [{
        "id": d.id,
        "image_url": d.image_path,
        "annotated_url": d.annotated_path,
        "detections": d.result_json,
        "ts": d.ts.isoformat() if d.ts else None,
    } for d in items]})
