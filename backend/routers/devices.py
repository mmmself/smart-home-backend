from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device, OpLog
from ..schemas import resp
import json

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
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        device = Device(device_id=device_id, name=device_id, type="unknown", state={})
        db.add(device)

    if device.state is None:
        device.state = {}
    device.state.update(body.state)
    db.add(OpLog(
        action=f"{body.action}_{device.type}" if device.type else body.action,
        target=device_id,
        operator="api",
        detail=body.state,
    ))
    db.commit()
    db.refresh(device)

    try:
        from ..services.mqtt_service import mqtt_publish
        from ..config import TOPIC_SUFFIX
        mqtt_publish(f"home/{TOPIC_SUFFIX}/cmd/{device_id}", json.dumps(body.state))
    except Exception:
        pass

    return resp({
        "device_id": device.device_id,
        "state": device.state,
    })
