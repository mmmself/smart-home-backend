from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://smart:smart123456@127.0.0.1:3306/smart_home?charset=utf8mb4")
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_SUFFIX = os.getenv("TOPIC_SUFFIX", "sh7k2d")
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.40"))
SERVERCHAN_KEY = os.getenv("SERVERCHAN_KEY", "")
FAN_AUTO_ON_TEMP = float(os.getenv("FAN_AUTO_ON_TEMP", "30"))
FAN_AUTO_OFF_TEMP = float(os.getenv("FAN_AUTO_OFF_TEMP", "29"))
LINKAGE_CLASS = os.getenv("LINKAGE_CLASS", "traffic light")
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "models/yolov8n.pt")
INSIGHTFACE_ROOT = os.getenv("INSIGHTFACE_ROOT", "models/insightface")
INSIGHTFACE_NAME = os.getenv("INSIGHTFACE_NAME", "buffalo_l")
API_KEY = os.getenv("API_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()]
