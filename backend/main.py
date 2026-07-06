from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from .database import engine, Base
from . import models
from .routers import persons, detect, face, devices, logs, scene, sensors
import os
import logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        from .services.mqtt_service import start_mqtt
        start_mqtt()
    except Exception as e:
        logging.getLogger(__name__).warning(f"MQTT startup failed: {e}")
    try:
        from .services.face_service import _load_embedding_cache
        _load_embedding_cache()
        logging.getLogger(__name__).info("人脸embedding缓存加载完成")
    except Exception as e:
        logging.getLogger(__name__).warning(f"人脸embedding缓存加载失败: {e}")
    yield


app = FastAPI(title="Smart Home Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(persons.router)
app.include_router(detect.router)
app.include_router(face.router)
app.include_router(devices.router)
app.include_router(logs.router)
app.include_router(scene.router)
app.include_router(sensors.router)


@app.get("/")
def root():
    return {"code": 0, "msg": "ok", "data": "Smart Home Backend"}
