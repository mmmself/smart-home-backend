from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device, OpLog
from ..schemas import resp
import json

router = APIRouter(prefix="/api")

SCENES = {
    "away": [("light01", {"on": False}), ("ac01", {"on": False}), ("door01", {"locked": True})],
    "home": [("light01", {"on": True}), ("ac01", {"on": True, "temp_set": 26})],
    "night": [("light01", {"on": True, "brightness": 10}), ("window01", {"open": False})],
}


@router.post("/scene/{name}")
def activate_scene(name: str, db: Session = Depends(get_db)):
    if name not in SCENES:
        return resp(code=1, msg=f"未知场景: {name}")

    changed = []
    for device_id, state in SCENES[name]:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            device = Device(device_id=device_id, name=device_id, type="unknown", state={})
            db.add(device)
        if device.state is None:
            device.state = {}
        device.state.update(state)
        changed.append(device_id)

    db.add(OpLog(
        action=f"scene_{name}",
        target="scene",
        operator="system",
        detail={"changed": changed},
    ))
    db.commit()

    return resp({"scene": name, "changed": changed})
