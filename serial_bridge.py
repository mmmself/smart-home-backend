#!/usr/bin/env python3
from __future__ import annotations

"""
serial_bridge.py — Arduino MCU 与后端之间的串口桥接脚本（根目录独立运行）。

功能：
  上行（Arduino → 板子）：
    TEMP,<n>  → MQTT publish home/{SUFFIX}/sensor/temperature  {"device_id":"mcu01","value":<n>}
    HUMI,<n>  → MQTT publish home/{SUFFIX}/sensor/humidity     {"device_id":"mcu01","value":<n>}
    KEY,OK    → POST {BACKEND_URL}/api/access/pin  {"result":"ok"}
    KEY,FAIL  → POST {BACKEND_URL}/api/access/pin  {"result":"fail"}
    DOOR,OPEN   → POST {BACKEND_URL}/api/access/door {"open":true}
    DOOR,CLOSED → POST {BACKEND_URL}/api/access/door {"open":false}

  下行（板子 → Arduino）：订阅 home/{SUFFIX}/cmd/#
    cmd/fan01     {on:true/false} → FAN,1 / FAN,0
    cmd/door01    {open:true}     → DOOR,1（忽略 open=false，MCU自动回位）
    cmd/display01 {text}          → OLED,<text>

容错：坏行忽略并打印；串口断开自动重连；不因单条异常退出。
"""

import os
import sys
import time
import json
import logging
import threading

import serial
import serial.tools.list_ports
import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv

load_dotenv()

# ── 配置 ──────────────────────────────────────────
SERIAL_PORT = os.getenv("SERIAL_PORT", "auto")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "9600"))
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_SUFFIX = os.getenv("TOPIC_SUFFIX", "sh7k2d")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

CANDIDATE_PORTS = ["/dev/ttyUSB0", "/dev/ttyACM0"]
RECONNECT_DELAY = 3  # 串口断开后重连等待秒数

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("serial_bridge")

# ── MQTT 客户端 ───────────────────────────────────
mqtt_client: mqtt.Client | None = None
# 串口写锁（下行可能从 MQTT 回调线程调用）
_serial_lock = threading.Lock()
serial_port: serial.Serial | None = None


def mqtt_publish(topic: str, payload: str):
    if mqtt_client and mqtt_client.is_connected():
        mqtt_client.publish(topic, payload)


def on_mqtt_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        topic = f"home/{TOPIC_SUFFIX}/cmd/#"
        client.subscribe(topic)
        logger.info(f"MQTT connected, subscribed to {topic}")
    else:
        logger.error(f"MQTT connection failed: rc={rc}")


def on_mqtt_message(client, userdata, msg):
    """下行：MQTT cmd → 串口写"""
    global serial_port
    try:
        topic_parts = msg.topic.split("/")
        # home/{SUFFIX}/cmd/{device_id} → ["home", SUFFIX, "cmd", device_id]
        if len(topic_parts) < 4:
            return
        device_id = topic_parts[3]
        payload_str = msg.payload.decode().strip()
        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError:
            logger.warning(f"下行 payload 非 JSON: {msg.topic} → {payload_str}")
            return

        serial_cmd = None

        if device_id == "fan01":
            on_val = payload.get("on")
            if on_val is True:
                serial_cmd = "FAN,1"
            elif on_val is False:
                serial_cmd = "FAN,0"

        elif device_id == "door01":
            if payload.get("open") is True:
                serial_cmd = "DOOR,1"
            # open=false 忽略，MCU 自动回位

        elif device_id == "display01":
            text = payload.get("text", "")
            if text:
                # OLED 仅英文 ASCII，≤21 字符/行，| 分隔多行
                if not isinstance(text, str):
                    text = str(text)
                text = text.encode("ascii", errors="ignore").decode("ascii")
                serial_cmd = f"OLED,{text}"

        if serial_cmd:
            with _serial_lock:
                if serial_port and serial_port.is_open:
                    serial_port.write((serial_cmd + "\n").encode("ascii"))
                    logger.info(f"下行 → 串口: {serial_cmd}")
                else:
                    logger.warning(f"串口未打开，丢弃下行: {serial_cmd}")
    except Exception as e:
        logger.warning(f"下行处理异常: {e}")


def start_mqtt():
    global mqtt_client
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        logger.info(f"MQTT client connecting to {MQTT_BROKER}:{MQTT_PORT}")
    except Exception as e:
        logger.error(f"MQTT 连接失败: {e}")


# ── 串口 ──────────────────────────────────────────
def open_serial() -> serial.Serial | None:
    """打开串口，auto 时依次尝试候选端口"""
    port_name = SERIAL_PORT

    if port_name == "auto":
        for p in CANDIDATE_PORTS:
            try:
                s = serial.Serial(p, SERIAL_BAUD, timeout=1)
                logger.info(f"串口已打开: {p} @ {SERIAL_BAUD}")
                return s
            except Exception as e:
                logger.debug(f"尝试 {p} 失败: {e}")
        logger.warning("auto 模式: 未找到可用串口 (ttyUSB0/ttyACM0)")
        return None
    else:
        try:
            s = serial.Serial(port_name, SERIAL_BAUD, timeout=1)
            logger.info(f"串口已打开: {port_name} @ {SERIAL_BAUD}")
            return s
        except Exception as e:
            logger.warning(f"打开 {port_name} 失败: {e}")
            return None


# ── 上行处理 ──────────────────────────────────────
def handle_uplink(line: str):
    """解析上行报文并分发"""
    line = line.strip()
    if not line:
        return

    parts = line.split(",")
    cmd = parts[0].upper()

    if cmd == "TEMP" and len(parts) >= 2:
        try:
            value = int(parts[1])
            payload = json.dumps({"device_id": "mcu01", "value": value})
            mqtt_publish(f"home/{TOPIC_SUFFIX}/sensor/temperature", payload)
            logger.info(f"上行 TEMP → MQTT: {value}°C")
        except ValueError:
            logger.warning(f"坏行(TEMP 值非法): {line}")

    elif cmd == "HUMI" and len(parts) >= 2:
        try:
            value = int(parts[1])
            payload = json.dumps({"device_id": "mcu01", "value": value})
            mqtt_publish(f"home/{TOPIC_SUFFIX}/sensor/humidity", payload)
            logger.info(f"上行 HUMI → MQTT: {value}%")
        except ValueError:
            logger.warning(f"坏行(HUMI 值非法): {line}")

    elif cmd == "KEY" and len(parts) >= 2:
        result = parts[1].upper()
        if result in ("OK", "FAIL"):
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/api/access/pin",
                    json={"result": result.lower()},
                    timeout=10,
                )
                logger.info(f"上行 KEY,{result} -> 后端: HTTP {resp.status_code}")
            except Exception as e:
                logger.warning(f"KEY,{result} 上报后端失败: {e}")
        else:
            logger.warning(f"坏行(KEY 值非法): {line}")

    elif cmd == "DOOR" and len(parts) >= 2:
        door_state = parts[1].upper()
        is_open = door_state == "OPEN"
        if door_state in ("OPEN", "CLOSED"):
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/api/access/door",
                    json={"open": is_open},
                    timeout=10,
                )
                logger.info(f"上行 DOOR,{door_state} -> 后端: HTTP {resp.status_code}")
            except Exception as e:
                logger.warning(f"DOOR,{door_state} 上报后端失败: {e}")
        else:
            logger.warning(f"坏行(DOOR 值非法): {line}")

    else:
        logger.warning(f"未知报文: {line}")


# ── 主循环 ────────────────────────────────────────
def main():
    global serial_port

    start_mqtt()
    time.sleep(1)  # 等 MQTT 连上

    logger.info("serial_bridge 启动，等待串口数据...")
    while True:
        serial_port = open_serial()
        if serial_port is None:
            logger.warning(f"串口未就绪，{RECONNECT_DELAY}s 后重试...")
            time.sleep(RECONNECT_DELAY)
            continue

        try:
            while True:
                raw = serial_port.readline()
                if not raw:
                    continue
                try:
                    line = raw.decode("ascii", errors="ignore")
                except Exception:
                    logger.warning(f"解码失败，原始字节: {raw!r}")
                    continue
                handle_uplink(line)
        except serial.SerialException as e:
            logger.warning(f"串口异常/断开: {e}")
            try:
                serial_port.close()
            except Exception:
                pass
            serial_port = None
            time.sleep(RECONNECT_DELAY)
        except KeyboardInterrupt:
            logger.info("收到 Ctrl+C，退出...")
            break
        except Exception as e:
            logger.warning(f"上行循环异常: {e}")
            time.sleep(1)

    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
    if serial_port and serial_port.is_open:
        serial_port.close()


if __name__ == "__main__":
    main()
