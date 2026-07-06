from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://smart:smart123456@127.0.0.1:3306/smart_home?charset=utf8mb4")
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_SUFFIX = os.getenv("TOPIC_SUFFIX", "sh7k2d")
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.40"))
SERVERCHAN_KEY = os.getenv("SERVERCHAN_KEY", "")
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
