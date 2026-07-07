from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device, OpLog
from ..services.device_service import apply_device_state
from ..schemas import resp

router = APIRouter(prefix="/api")


class CommandBody(BaseModel):
    action: str
    state: dict[str, Any]


@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    result = []
    for d in devices:
        item = {
            "device_id": d.device_id,
            "name": d.name,
            "type": d.type,
            "state": d.state,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        if d.type == "door":
            last = db.query(OpLog).filter(
                OpLog.target == d.device_id, OpLog.action == "door_open"
            ).order_by(OpLog.ts.desc()).first()
            item["last_access"] = {"name": last.operator, "ts": last.ts.isoformat()} if last else None
        result.append(item)
    return resp(result)


@router.post("/devices/{device_id}/command")
def device_command(device_id: str, body: CommandBody, db: Session = Depends(get_db)):
    device = apply_device_state(
        db, device_id, body.state,
        action=body.action, operator="api",
    )
    if device_id == "fan01" and body.state.get("auto") is False:
        from ..services.mqtt_service import reset_fan_auto
        reset_fan_auto()
    return resp({
        "device_id": device.device_id,
        "state": device.state,
    })
