from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from ..database import get_db
from ..models import Person, Face
from ..schemas import PersonIn, PersonOut, PersonUpdate, resp
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/api")


@router.get("/persons")
def list_persons(
    keyword: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Person)
    if keyword:
        q = q.filter(Person.name.contains(keyword))
    total = q.count()
    items = q.order_by(Person.id.desc()).offset((page - 1) * size).limit(size).all()

    result = []
    for p in items:
        face_count = db.query(sqlfunc.count(Face.id)).filter(Face.person_id == p.id).scalar()
        po = PersonOut.model_validate(p)
        po.face_count = face_count or 0
        result.append(po)

    return resp({"total": total, "items": result})


@router.post("/persons")
def create_person(body: PersonIn, db: Session = Depends(get_db)):
    p = Person(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return resp(PersonOut.model_validate(p).model_dump())


@router.get("/persons/{person_id}")
def get_person(person_id: int, db: Session = Depends(get_db)):
    p = db.query(Person).filter(Person.id == person_id).first()
    if not p:
        return resp(code=1, msg="人员不存在")
    face_count = db.query(sqlfunc.count(Face.id)).filter(Face.person_id == p.id).scalar()
    po = PersonOut.model_validate(p)
    po.face_count = face_count or 0
    return resp(po)


@router.put("/persons/{person_id}")
def update_person(person_id: int, body: PersonUpdate, db: Session = Depends(get_db)):
    p = db.query(Person).filter(Person.id == person_id).first()
    if not p:
        return resp(code=1, msg="人员不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return resp(PersonOut.model_validate(p).model_dump())


@router.delete("/persons/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    p = db.query(Person).filter(Person.id == person_id).first()
    if not p:
        return resp(code=1, msg="人员不存在")
    db.delete(p)
    db.commit()
    return resp()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    today = datetime.now().strftime("%Y%m%d")
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    upload_dir = os.path.join(backend_dir, "uploads", today)
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/uploads/{today}/{filename}"
    return resp({"path": url})
