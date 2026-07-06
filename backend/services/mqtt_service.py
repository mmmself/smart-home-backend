import paho.mqtt.client as mqtt
import json
import logging
import threading
from ..config import MQTT_BROKER, MQTT_PORT, TOPIC_SUFFIX

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
        from ..models import SensorData, Device, OpLog
        db = SessionLocal()
        try:
            sd = SensorData(device_id=device_id, metric=metric, value=value)
            db.add(sd)

            global _fan_auto_on
            if metric == "temperature" and value > 30 and not _fan_auto_on:
                _fan_auto_on = True
                fan = db.query(Device).filter(Device.device_id == "fan01").first()
                if not fan:
                    fan = Device(device_id="fan01", name="风扇", type="fan", state={})
                    db.add(fan)
                if fan.state is None:
                    fan.state = {}
                fan.state["on"] = True
                fan.state["auto"] = True
                db.add(OpLog(
                    action="fan_auto_on",
                    target="fan01",
                    operator="system",
                    detail={"temperature": value, "reason": "高温自动激活"},
                ))
                logger.info(f"高温联动: 温度{value}°C > 30°C, 风扇自动开启")
            elif metric == "temperature" and value <= 29 and _fan_auto_on:
                _fan_auto_on = False

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
    global _client
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
