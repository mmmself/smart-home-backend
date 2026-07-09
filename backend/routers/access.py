from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device, OpLog
from ..services.device_service import apply_device_state
from ..services.notify import push_stranger
from ..schemas import resp
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/access")


class PinResult(BaseModel):
    result: str  # "ok" 或 "fail"


class DoorStateReport(BaseModel):
    open: bool  # True=开门, False=关门


@router.post("/pin")
def pin_event(body: PinResult, db: Session = Depends(get_db)):
    result = body.result.lower().strip()

    if result == "ok":
        db.add(OpLog(
            action="door_open",
            target="door01",
            operator="keypad",
            detail={"method": "keypad"},
        ))
        device = db.query(Device).filter(Device.device_id == "door01").first()
        if device:
            if device.state is None:
                device.state = {}
            device.state["open"] = True
        db.commit()
        apply_device_state(db, "display01", {"text": "Welcome"},
                           action="oled", operator="system")
        logger.info("键盘门禁: PIN 校验通过 (KEY,OK), 已记录 door_open")
        return resp({"event": "door_open", "method": "keypad"})

    elif result == "fail":
        db.add(OpLog(
            action="door_deny",
            target="door01",
            operator="keypad",
            detail={"method": "keypad"},
        ))
        db.commit()
        apply_device_state(db, "display01", {"text": "Access Denied"},
                           action="oled", operator="system")
        push_stranger()
        logger.info("键盘门禁: PIN 校验失败 (KEY,FAIL), 已记录 door_deny")
        return resp({"event": "door_deny", "method": "keypad"})

    else:
        return resp(code=1, msg=f"无效的 result: {body.result}, 应为 ok 或 fail")


@router.post("/door")
def door_state_report(body: DoorStateReport, db: Session = Depends(get_db)):
    """MCU 上报门状态变化（DOOR,OPEN / DOOR,CLOSED），同步数据库状态。

    注意：不通过 apply_device_state 下发 MQTT，避免指令回环（MCU 自身已执行动作）。
    """
    device = db.query(Device).filter(Device.device_id == "door01").first()
    if device is None:
        device = Device(device_id="door01", name="大门", type="door", state={})
        db.add(device)
    if device.state is None:
        device.state = {}
    device.state["open"] = body.open
    db.commit()
    db.refresh(device)
    logger.info(f"门状态回写: door01 open={body.open}")
    return resp({"device_id": "door01", "state": device.state})
