from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Person, Face, OpLog
from ..services.face_service import get_embedding, cosine
from ..services.notify import push_stranger
from ..schemas import resp
from ..config import FACE_THRESHOLD
import os
import uuid
import numpy as np
from datetime import datetime

router = APIRouter(prefix="/api/face")


@router.post("/enroll")
async def enroll(
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
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    content = await file.read()
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

    return resp({"face_id": face.id, "image_url": image_url})


@router.post("/verify")
async def verify(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    today = datetime.now().strftime("%Y%m%d")
    upload_dir = os.path.join(backend_dir, "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    emb = get_embedding(filepath)
    snapshot_url = f"/uploads/{today}/{filename}"

    if emb is None:
        return resp(code=1, msg="未检测到人脸")

    all_faces = db.query(Face).all()
    best_score = -1.0
    best_face = None

    for face in all_faces:
        stored_emb = np.frombuffer(face.embedding, dtype=np.float32)
        score = cosine(emb, stored_emb)
        if score > best_score:
            best_score = score
            best_face = face

    if best_score >= FACE_THRESHOLD and best_face is not None:
        person = db.query(Person).filter(Person.id == best_face.person_id).first()
        db.add(OpLog(
            action="door_open",
            target="door01",
            operator=person.name if person else "face_recognition",
            detail={"score": best_score, "face_id": best_face.id},
        ))
        db.commit()
        return resp({
            "pass": True,
            "score": best_score,
            "person": {"id": person.id, "name": person.name} if person else None,
            "snapshot_url": snapshot_url,
        })
    else:
        db.add(OpLog(
            action="door_deny",
            target="door01",
            operator="face_recognition",
            detail={"score": best_score},
        ))
        db.commit()
        push_stranger(snapshot_url, best_score)
        return resp({
            "pass": False,
            "score": best_score,
            "person": None,
            "snapshot_url": snapshot_url,
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
    return resp()
