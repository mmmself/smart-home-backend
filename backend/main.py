from fastapi import FastAPI, Depends, Security, HTTPException, status
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from .database import engine, Base
from . import models
from .routers import persons, detect, face, devices, logs, scene, sensors, access
from .config import CORS_ORIGINS, API_KEY
import os
import logging

logger = logging.getLogger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str = Security(_api_key_header)):
    if not API_KEY:
        return None
    if api_key != API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
    return api_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        from .services.mqtt_service import start_mqtt
        start_mqtt()
    except Exception as e:
        logger.warning(f"MQTT startup failed: {e}")
    try:
        from .services.face_service import _load_embedding_cache, _get_app
        _load_embedding_cache()
        logger.info("人脸embedding缓存加载完成")
    except Exception as e:
        logger.warning(f"人脸embedding缓存加载失败: {e}")
    try:
        from .services.yolo_service import _get_model
        _get_model()
        logger.info("YOLO模型预热完成")
    except Exception as e:
        logger.warning(f"YOLO模型预热失败: {e}")
    try:
        _get_app()
        logger.info("InsightFace模型预热完成")
    except Exception as e:
        logger.warning(f"InsightFace模型预热失败: {e}")
    yield


app = FastAPI(title="Smart Home Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(persons.router, dependencies=[Depends(verify_api_key)])
app.include_router(detect.router, dependencies=[Depends(verify_api_key)])
app.include_router(face.router, dependencies=[Depends(verify_api_key)])
app.include_router(devices.router, dependencies=[Depends(verify_api_key)])
app.include_router(logs.router, dependencies=[Depends(verify_api_key)])
app.include_router(scene.router, dependencies=[Depends(verify_api_key)])
app.include_router(sensors.router, dependencies=[Depends(verify_api_key)])
app.include_router(access.router, dependencies=[Depends(verify_api_key)])


@app.get("/")
def root():
    return {"code": 0, "msg": "ok", "data": "Smart Home Backend"}


@app.get("/api/health")
def health():
    return {"code": 0, "msg": "ok", "data": {"status": "healthy"}}
