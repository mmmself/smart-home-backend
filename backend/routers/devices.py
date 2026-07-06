from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device
from ..services.device_service import apply_device_state
from ..schemas import resp

router = APIRouter(prefix="/api")


class CommandBody(BaseModel):
    action: str
    state: dict[str, Any]


@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    return resp([{
        "device_id": d.device_id,
        "name": d.name,
        "type": d.type,
        "state": d.state,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
    } for d in devices])


@router.post("/devices/{device_id}/command")
def device_command(device_id: str, body: CommandBody, db: Session = Depends(get_db)):
    device = apply_device_state(
        db, device_id, body.state,
        action=body.action, operator="api",
    )
    return resp({
        "device_id": device.device_id,
        "state": device.state,
    })
