import json
import logging
from sqlalchemy.orm import Session
from ..models import Device, OpLog

logger = logging.getLogger(__name__)


def apply_device_state(
    db: Session,
    device_id: str,
    state: dict,
    action: str,
    operator: str,
):
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        device = Device(device_id=device_id, name=device_id, type="unknown", state={})
        db.add(device)
    if device.state is None:
        device.state = {}
    device.state.update(state)
    db.add(OpLog(
        action=action,
        target=device_id,
        operator=operator,
        detail=state,
    ))
    db.commit()
    db.refresh(device)

    try:
        from .mqtt_service import mqtt_publish
        from ..config import TOPIC_SUFFIX
        mqtt_publish(f"home/{TOPIC_SUFFIX}/cmd/{device_id}", json.dumps(state))
    except Exception as e:
        logger.warning(f"MQTT publish failed for {device_id}: {e}")

    return device
