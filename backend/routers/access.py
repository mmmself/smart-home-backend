from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import OpLog
from ..services.device_service import apply_device_state
from ..services.notify import push_stranger
from ..schemas import resp
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/access")


class PinResult(BaseModel):
    result: str  # "ok" 或 "fail"


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
