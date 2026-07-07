from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Person, Face, OpLog
from ..services.face_service import get_embedding, add_embedding_cache, remove_embedding_cache, _rebuild_matrix
from ..services.notify import push_stranger
from ..services.upload import validate_upload
from ..services.device_service import apply_device_state
from ..schemas import resp
from ..config import FACE_THRESHOLD
import os
import uuid
import numpy as np
from datetime import datetime

router = APIRouter(prefix="/api/face")


@router.post("/enroll")
def enroll(
    person_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return resp(code=1, msg="人员不存在")

    backend_dir = os.path.dirname(os.path.dirname(__file__))
    today = datetime.now().strftime("%Y%m%d")
    upload_dir = os.path.join(backend_dir, "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    content = file.file.read()
    ext = validate_upload(file, content)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    emb = get_embedding(filepath)
    if emb is None:
        os.remove(filepath)
        return resp(code=1, msg="未检测到人脸")

    image_url = f"/uploads/{today}/{filename}"
    face = Face(
        person_id=person_id,
        image_path=image_url,
        embedding=emb.tobytes(),
    )
    db.add(face)
    db.commit()
    db.refresh(face)
    add_embedding_cache(face.id, emb)

    return resp({"face_id": face.id, "image_url": image_url})


@router.post("/verify")
def verify(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    today = datetime.now().strftime("%Y%m%d")
    upload_dir = os.path.join(backend_dir, "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    content = file.file.read()
    ext = validate_upload(file, content)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    emb = get_embedding(filepath)
    snapshot_url = f"/uploads/{today}/{filename}"

    if emb is None:
        os.remove(filepath)
        return resp(code=1, msg="未检测到人脸")

    all_faces = db.query(Face).all()
    if not all_faces:
        os.remove(filepath)
        return resp(code=1, msg="人脸库为空")

    embs, face_ids = _rebuild_matrix()
    if embs is not None and len(face_ids) > 0:
        scores = embs @ emb
        best_idx = int(np.argmax(scores))
        best_score = float(scores[best_idx])
        face_id_map = {f.id: f for f in all_faces}
        best_face = face_id_map.get(face_ids[best_idx])
    else:
        best_score = -1.0
        best_face = None
        for face in all_faces:
            stored_emb = np.frombuffer(face.embedding, dtype=np.float32)
            score = float(np.dot(emb, stored_emb))
            if score > best_score:
                best_score = score
                best_face = face

    matched_person = None
    deny_reason = None

    if best_score >= FACE_THRESHOLD and best_face is not None:
        matched_person = db.query(Person).filter(Person.id == best_face.person_id).first()
        if matched_person and not matched_person.is_active:
            deny_reason = "person_inactive"

    if matched_person and matched_person.is_active:
        db.add(OpLog(
            action="door_open",
            target="door01",
            operator=matched_person.name,
            detail={"score": best_score, "face_id": best_face.id},
        ))
        db.commit()
        apply_device_state(db, "door01", {"open": True},
                           action="door_open", operator=matched_person.name)
        apply_device_state(db, "display01", {"text": f"Welcome {matched_person.name}"},
                           action="oled", operator="system")
        return resp({
            "pass": True,
            "score": best_score,
            "person": {"id": matched_person.id, "name": matched_person.name},
            "snapshot_url": snapshot_url,
        })
    else:
        db.add(OpLog(
            action="door_deny",
            target="door01",
            operator="face_recognition",
            detail={"score": best_score, "reason": deny_reason or "low_score"},
        ))
        db.commit()
        apply_device_state(db, "display01", {"text": "Access Denied"},
                           action="oled", operator="system")
        notified = push_stranger(snapshot_url, best_score)
        return resp({
            "pass": False,
            "score": best_score,
            "person": None,
            "snapshot_url": snapshot_url,
            "notified": notified,
        })


@router.get("/library")
def face_library(db: Session = Depends(get_db)):
    persons = db.query(Person).all()
    result = []
    for p in persons:
        faces = db.query(Face).filter(Face.person_id == p.id).all()
        result.append({
            "person_id": p.id,
            "name": p.name,
            "faces": [{"id": f.id, "image_path": f.image_path, "created_at": f.created_at.isoformat() if f.created_at else None} for f in faces],
        })
    return resp(result)


@router.delete("/{face_id}")
def delete_face(face_id: int, db: Session = Depends(get_db)):
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        return resp(code=1, msg="人脸记录不存在")
    db.delete(face)
    db.commit()
    remove_embedding_cache(face_id)
    return resp()
