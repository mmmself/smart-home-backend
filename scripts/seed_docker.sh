#!/bin/bash
# Run seed.py inside Docker container where MySQL is accessible
# This avoids Docker Desktop WSL port forwarding auth issues

cd /home/yue01/home-assistant/smart-home-backend

# Install pymysql inside container if needed
docker exec smart_home_mysql pip3 install pymysql sqlalchemy 2>/dev/null || true

# Pipe the seed script into the container's Python
cat scripts/seed.py | docker exec -i smart_home_mysql python3 -c "
import sys
sys.path.insert(0, '.')

# Override database URL to use container's localhost
import os
os.environ['DATABASE_URL'] = 'mysql+pymysql://smart:smart123456@127.0.0.1:3306/smart_home?charset=utf8mb4'

# Patch backend config
from types import SimpleNamespace
backend_config = SimpleNamespace(DATABASE_URL=os.environ['DATABASE_URL'])

# Execute seed logic directly with container-local connection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime,
                        ForeignKey, JSON, LargeBinary, Index, Text)
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
import random, math

engine = create_engine('mysql+pymysql://smart:smart123456@127.0.0.1:3306/smart_home?charset=utf8mb4', pool_pre_ping=True)
Base = declarative_base()

class Person(Base):
    __tablename__ = 'persons'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    phone = Column(String(32))
    role = Column(String(16), default='guest')
    avatar_path = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Face(Base):
    __tablename__ = 'faces'
    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey('persons.id', ondelete='CASCADE'))
    image_path = Column(String(255))
    embedding = Column(LargeBinary)
    created_at = Column(DateTime, server_default=func.now())

class SensorData(Base):
    __tablename__ = 'sensor_data'
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32))
    metric = Column(String(32))
    value = Column(Float)
    ts = Column(DateTime, server_default=func.now())
    __table_args__ = (Index('idx_metric_ts', 'metric', 'ts'),)

class Device(Base):
    __tablename__ = 'devices'
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), unique=True)
    name = Column(String(64))
    type = Column(String(16))
    state = Column(JSON)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class OpLog(Base):
    __tablename__ = 'op_logs'
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(32))
    target = Column(String(32))
    operator = Column(String(64))
    detail = Column(JSON)
    ts = Column(DateTime, server_default=func.now())
    __table_args__ = (Index('idx_ts', 'ts'),)

class Detection(Base):
    __tablename__ = 'detections'
    id = Column(Integer, primary_key=True, autoincrement=True)
    image_path = Column(String(255))
    annotated_path = Column(String(255))
    result_json = Column(JSON)
    ts = Column(DateTime, server_default=func.now())

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()
TZ = timezone(timedelta(hours=8))

try:
    persons = [
        Person(name='张三', phone='13800000001', role='owner'),
        Person(name='李四', phone='13800000002', role='family'),
        Person(name='王五', phone='13800000003', role='family'),
    ]
    db.add_all(persons)
    db.flush()

    devices_data = [
        Device(device_id='light01', name='客厅灯', type='light', state={'on': True, 'brightness': 80}),
        Device(device_id='ac01', name='客厅空调', type='ac', state={'on': False, 'temp_set': 26}),
        Device(device_id='fan01', name='风扇', type='fan', state={'on': False, 'auto': False}),
        Device(device_id='door01', name='大门', type='door', state={'locked': True}),
        Device(device_id='window01', name='窗户', type='window', state={'open': False}),
    ]
    db.add_all(devices_data)

    now = datetime.now(TZ)
    for i in range(24 * 60 // 5):
        ts = now - timedelta(hours=24) + timedelta(minutes=i * 5)
        t = i * 5 * 60
        temp = round(26 + 4 * math.sin(2 * math.pi * t / 86400) + random.gauss(0, 0.3), 1)
        hum = round(55 + 15 * math.sin(2 * math.pi * t / 86400 + math.pi) + random.gauss(0, 2), 1)
        db.add(SensorData(device_id='sensor01', metric='temperature', value=temp, ts=ts))
        db.add(SensorData(device_id='sensor01', metric='humidity', value=hum, ts=ts))

    logs = [
        OpLog(action='door_open', target='door01', operator='张三', detail={'score': 0.92}, ts=now - timedelta(hours=2)),
        OpLog(action='door_open', target='door01', operator='李四', detail={'score': 0.88}, ts=now - timedelta(hours=5)),
        OpLog(action='door_deny', target='door01', operator='face_recognition', detail={'score': 0.21}, ts=now - timedelta(hours=3)),
        OpLog(action='light_on', target='light01', operator='system', detail={'brightness': 80}, ts=now - timedelta(hours=8)),
        OpLog(action='scene_away', target='scene', operator='system', detail={'changed': ['light01', 'ac01']}, ts=now - timedelta(hours=10)),
        OpLog(action='fan_auto_on', target='fan01', operator='system', detail={'temperature': 31.2}, ts=now - timedelta(hours=6)),
        OpLog(action='light_on', target='light01', operator='api', detail={'brightness': 50}, ts=now - timedelta(hours=12)),
        OpLog(action='ac_on', target='ac01', operator='api', detail={'temp_set': 24}, ts=now - timedelta(hours=15)),
    ]
    for i in range(12):
        actions = ['light_on', 'light_off', 'ac_on', 'ac_off', 'door_open', 'door_close', 'scene_home']
        db.add(OpLog(action=random.choice(actions), target=random.choice(['light01', 'ac01', 'door01']),
               operator=random.choice(['张三', 'system', 'api']), detail={},
               ts=now - timedelta(hours=random.randint(1, 23))))
    db.add_all(logs)
    db.commit()

    print('Seed OK! Persons:', db.query(Person).count(), 'Devices:', db.query(Device).count(), 'Sensors:', db.query(SensorData).count(), 'Logs:', db.query(OpLog).count())
finally:
    db.close()
" 2>&1
