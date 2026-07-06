import paho.mqtt.client as mqtt
import json
import time
import math
import random
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_SUFFIX = os.getenv("TOPIC_SUFFIX", "sh7k2d")
TZ = timezone(timedelta(hours=8))

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

print(f"设备模拟器启动, 每3秒向 home/{TOPIC_SUFFIX}/sensor/ 发送数据...")

counter = 0
start_time = time.time()

while True:
    counter += 1
    elapsed = counter * 3
    t = elapsed % 86400

    base_temp = 26 + 4 * math.sin(2 * math.pi * t / 86400)
    noise_temp = random.gauss(0, 0.5)
    temperature = round(base_temp + noise_temp, 1)

    if counter % 20 == 0:
        temperature = round(30.5 + random.random() * 2, 1)

    humidity = round(50 + 15 * math.sin(2 * math.pi * t / 86400 + math.pi) + random.gauss(0, 3), 1)
    humidity = max(20, min(90, humidity))

    ts = datetime.now(TZ).isoformat()

    temp_payload = json.dumps({"device_id": "sensor01", "value": temperature, "ts": ts})
    hum_payload = json.dumps({"device_id": "sensor01", "value": humidity, "ts": ts})

    client.publish(f"home/{TOPIC_SUFFIX}/sensor/temperature", temp_payload)
    client.publish(f"home/{TOPIC_SUFFIX}/sensor/humidity", hum_payload)

    print(f"[{ts}] 温度: {temperature}°C | 湿度: {humidity}%")
    time.sleep(3)
