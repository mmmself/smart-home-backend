from __future__ import annotations

import paho.mqtt.client as mqtt
import json
import logging
import threading
from ..config import MQTT_BROKER, MQTT_PORT, TOPIC_SUFFIX, FAN_AUTO_ON_TEMP, FAN_AUTO_OFF_TEMP

logger = logging.getLogger(__name__)

_client: mqtt.Client | None = None
_fan_auto_on = False


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        topic = f"home/{TOPIC_SUFFIX}/sensor/#"
        client.subscribe(topic)
        logger.info(f"MQTT connected, subscribed to {topic}")
    else:
        logger.error(f"MQTT connection failed: rc={rc}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        device_id = payload.get("device_id", "unknown")
        metric = msg.topic.split("/")[-1]
        value = float(payload.get("value", 0))
        ts = payload.get("ts")

        from ..database import SessionLocal
        from ..models import SensorData
        db = SessionLocal()
        try:
            sd = SensorData(device_id=device_id, metric=metric, value=value)
            db.add(sd)

            global _fan_auto_on
            if metric == "temperature" and value > FAN_AUTO_ON_TEMP and not _fan_auto_on:
                _fan_auto_on = True
                from .device_service import apply_device_state
                apply_device_state(db, "fan01", {"on": True, "auto": True},
                                   action="fan_auto_on", operator="system")
                logger.info(f"高温联动: 温度{value}°C > {FAN_AUTO_ON_TEMP}°C, 风扇自动开启")
            elif metric == "temperature" and value <= FAN_AUTO_OFF_TEMP and _fan_auto_on:
                _fan_auto_on = False
                from .device_service import apply_device_state
                apply_device_state(db, "fan01", {"on": False, "auto": False},
                                   action="fan_auto_off", operator="system")
                logger.info(f"降温联动: 温度{value}°C <= {FAN_AUTO_OFF_TEMP}°C, 风扇自动关闭")

            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"MQTT消息处理失败: {e}")


def mqtt_publish(topic: str, payload: str):
    global _client
    if _client and _client.is_connected():
        _client.publish(topic, payload)


def start_mqtt():
    global _client, _fan_auto_on
    try:
        from ..database import SessionLocal
        from ..models import Device
        db = SessionLocal()
        fan = db.query(Device).filter(Device.device_id == "fan01").first()
        if fan and isinstance(fan.state, dict):
            _fan_auto_on = bool(fan.state.get("auto", False))
            logger.info(f"风扇自动状态从数据库恢复: {_fan_auto_on}")
        db.close()
    except Exception as e:
        logger.warning(f"恢复风扇自动状态失败: {e}")
    _client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    _client.on_connect = on_connect
    _client.on_message = on_message
    _client.connect(MQTT_BROKER, MQTT_PORT, 60)
    _client.loop_start()
    logger.info("MQTT client started")


def stop_mqtt():
    global _client
    if _client:
        _client.loop_stop()
        _client.disconnect()


def reset_fan_auto():
    global _fan_auto_on
    _fan_auto_on = False
    logger.info("风扇自动模式已重置(手动操作)")
