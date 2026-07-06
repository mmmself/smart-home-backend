from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime,
                        ForeignKey, JSON, LargeBinary, Index, Text)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.mutable import MutableDict
from .database import Base


class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    phone = Column(String(32))
    role = Column(String(16), default="guest")
    avatar_path = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    faces = relationship("Face", backref="person", cascade="all, delete-orphan")


class Face(Base):
    __tablename__ = "faces"
    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), index=True)
    image_path = Column(String(255))
    embedding = Column(LargeBinary)
    created_at = Column(DateTime, server_default=func.now())


class SensorData(Base):
    __tablename__ = "sensor_data"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32))
    metric = Column(String(32))
    value = Column(Float)
    ts = Column(DateTime, server_default=func.now())
    __table_args__ = (Index("idx_metric_ts", "metric", "ts"),)


class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), unique=True)
    name = Column(String(64))
    type = Column(String(16))
    state = Column(MutableDict.as_mutable(JSON))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OpLog(Base):
    __tablename__ = "op_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(32))
    target = Column(String(32))
    operator = Column(String(64))
    detail = Column(MutableDict.as_mutable(JSON))
    ts = Column(DateTime, server_default=func.now())
    __table_args__ = (Index("idx_ts", "ts"),)


class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, autoincrement=True)
    image_path = Column(String(255))
    annotated_path = Column(String(255))
    result_json = Column(JSON)
    ts = Column(DateTime, server_default=func.now())
