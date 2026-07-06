from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.device_service import apply_device_state
from ..schemas import resp

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
        apply_device_state(db, device_id, state,
                           action=f"scene_{name}", operator="system")
        changed.append(device_id)

    return resp({"scene": name, "changed": changed})
