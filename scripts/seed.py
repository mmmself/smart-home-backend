import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone, timedelta
import random
import math
from backend.database import SessionLocal, engine, Base
from backend.models import Person, Face, Device, OpLog, SensorData, Detection
from backend import models

TZ = timezone(timedelta(hours=8))

force = "--force" in sys.argv
if not force:
    print("seed.py 会清空并重建所有数据！加 --force 确认执行:")
    print("  python scripts/seed.py --force")
    sys.exit(1)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    persons = [
        Person(name="张三", phone="13800000001", role="owner"),
        Person(name="李四", phone="13800000002", role="family"),
        Person(name="王五", phone="13800000003", role="family"),
    ]
    db.add_all(persons)
    db.flush()

    devices = [
        Device(device_id="light01", name="客厅灯", type="light", state={"on": True, "brightness": 80}),
        Device(device_id="ac01", name="客厅空调", type="ac", state={"on": False, "temp_set": 26}),
        Device(device_id="fan01", name="风扇", type="fan", state={"on": False, "auto": False}),
        Device(device_id="door01", name="大门", type="door", state={"locked": True}),
        Device(device_id="window01", name="窗户", type="window", state={"open": False}),
    ]
    db.add_all(devices)

    now = datetime.now(TZ)
    for i in range(24 * 60 // 5):
        ts = now - timedelta(hours=24) + timedelta(minutes=i * 5)
        t = i * 5 * 60
        temp = round(26 + 4 * math.sin(2 * math.pi * t / 86400) + random.gauss(0, 0.3), 1)
        hum = round(55 + 15 * math.sin(2 * math.pi * t / 86400 + math.pi) + random.gauss(0, 2), 1)
        db.add(SensorData(device_id="sensor01", metric="temperature", value=temp, ts=ts))
        db.add(SensorData(device_id="sensor01", metric="humidity", value=hum, ts=ts))

    logs_data = [
        OpLog(action="door_open", target="door01", operator="张三", detail={"score": 0.92}, ts=now - timedelta(hours=2)),
        OpLog(action="door_open", target="door01", operator="李四", detail={"score": 0.88}, ts=now - timedelta(hours=5)),
        OpLog(action="door_deny", target="door01", operator="face_recognition", detail={"score": 0.21}, ts=now - timedelta(hours=3)),
        OpLog(action="light_on", target="light01", operator="system", detail={"brightness": 80}, ts=now - timedelta(hours=8)),
        OpLog(action="scene_away", target="scene", operator="system", detail={"changed": ["light01", "ac01"]}, ts=now - timedelta(hours=10)),
        OpLog(action="fan_auto_on", target="fan01", operator="system", detail={"temperature": 31.2}, ts=now - timedelta(hours=6)),
        OpLog(action="light_on", target="light01", operator="api", detail={"brightness": 50}, ts=now - timedelta(hours=12)),
        OpLog(action="ac_on", target="ac01", operator="api", detail={"temp_set": 24}, ts=now - timedelta(hours=15)),
    ]
    for i in range(12):
        actions = ["light_on", "light_off", "ac_on", "ac_off", "door_open", "door_close", "scene_home"]
        db.add(OpLog(
            action=random.choice(actions),
            target=random.choice(["light01", "ac01", "door01"]),
            operator=random.choice(["张三", "system", "api"]),
            detail={},
            ts=now - timedelta(hours=random.randint(1, 23)),
        ))
    db.add_all(logs_data)

    db.commit()
    print("种子数据导入完成!")
    print(f"  - 人员: {db.query(Person).count()} 条")
    print(f"  - 设备: {db.query(Device).count()} 条")
    print(f"  - 传感器数据: {db.query(SensorData).count()} 条")
    print(f"  - 操作日志: {db.query(OpLog).count()} 条")
finally:
    db.close()
