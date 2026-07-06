from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from . import models
from .routers import persons, detect, face, devices, logs, scene, sensors
import os

app = FastAPI(title="Smart Home Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        from .services.mqtt_service import start_mqtt
        start_mqtt()
    except Exception:
        pass


@app.get("/")
def root():
    return {"code": 0, "msg": "ok", "data": "Smart Home Backend"}
