# 智能家居数据智能系统 · 后端构建规格(opencode + DeepSeek 执行版)

> 这是一份**照抄级**规格。执行者是 opencode 驱动的 DeepSeek。要求:严格按 STAGE 顺序执行,**每个 STAGE 结束必须运行"验证命令"并贴出输出,通过后才能进入下一个 STAGE**。不要一次性生成整个项目;不要自作主张更换技术栈、库或数据库;不要跳过验证。遇到报错先修复当前 STAGE,不要往下推进。

---

## 0. 全局约定(先读,后面反复引用)

**技术栈(锁定,禁止更换):**
- Python 3.10 / FastAPI / Uvicorn
- **数据库:MySQL 8.0**(不是 SQLite)。ORM 用 SQLAlchemy 2.x,驱动 `pymysql`。
- 目标检测:`ultralytics` YOLOv8n
- 人脸识别:`insightface` + `onnxruntime`(装不上再降级 `face_recognition`)
- MQTT:`paho-mqtt`,broker 用公共 `broker.emqx.io:1883`
- 前端另有独立仓库/目录,本规格只负责后端 + 模拟器 + 基础设施

**统一响应格式:** 所有接口返回 `{"code": 0, "msg": "ok", "data": ...}`,失败 `code != 0`。
**时间:** 一律 ISO8601 带时区字符串(UTC+8),如 `2026-07-06T14:30:00+08:00`。
**上传文件:** 存 `backend/uploads/{yyyymmdd}/{uuid}.jpg`,经 `/uploads/...` 静态路由回显。
**配置:** 全部集中在 `backend/.env`,用 `python-dotenv` 读取。禁止在代码里硬编码密码/密钥。

**目录结构(agent 第一步就建好):**
```
smart-home-backend/
├── docker-compose.yml        # 只跑 MySQL
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── backend/
│   ├── main.py
│   ├── config.py             # 读 .env
│   ├── database.py           # engine / SessionLocal / Base / get_db
│   ├── models.py
│   ├── schemas.py            # pydantic 响应模型 + 统一 resp() 包装
│   ├── deps.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── persons.py
│   │   ├── detect.py
│   │   ├── face.py
│   │   ├── devices.py
│   │   ├── sensors.py
│   │   ├── logs.py
│   │   └── scene.py
│   ├── services/
│   │   ├── yolo_service.py
│   │   ├── face_service.py
│   │   ├── mqtt_service.py
│   │   └── notify.py
│   └── uploads/.gitkeep
├── simulator/
│   └── device_sim.py
├── scripts/
│   ├── init_db.sql
│   └── seed.py
└── models/                    # 存 yolov8n.pt / 自定义训练权重(git 忽略大文件)
```

---

## STAGE 0 — 环境准备(参考老师的安装文档,固化流程)

> 参考老师《YOLO V8 安装与配置教程》。目的是让 agent 用固定流程建环境,不要乱装。

**0.1 建 conda 虚拟环境:**
```bash
conda create -n yoloV8 python=3.10 -y
conda activate yoloV8
```

**0.2 装依赖。** 先写 `requirements.txt`:
```
fastapi==0.115.*
uvicorn[standard]==0.32.*
sqlalchemy==2.0.*
pymysql==1.1.*
cryptography          # pymysql 连接 MySQL8 的 caching_sha2_password 需要
python-dotenv==1.0.*
python-multipart==0.0.*
pydantic==2.*
ultralytics==8.*
opencv-python-headless
insightface
onnxruntime
paho-mqtt==2.*
requests
numpy
```
安装:
```bash
pip install -r requirements.txt
```
> PyTorch 会被 ultralytics 自动拉 CPU 版。如果机器有 NVIDIA 显卡想用 GPU,按 https://pytorch.org/get-started/locally/ 先单独装对应 CUDA 版的 torch,再装其余依赖。CPU 版对本项目(小图推理)足够。

**0.3 验证 torch:** 新建 `scripts/torch_check.py`:
```python
import torch
print("torch", torch.__version__)
print("cuda available:", torch.cuda.is_available())
```
**✅ STAGE 0 验证命令:**
```bash
conda activate yoloV8 && python scripts/torch_check.py
```
输出打印出 torch 版本即算通过(cuda False 也 OK)。

---

## STAGE 1 — MySQL 与数据库层

**1.1 用 docker-compose 起 MySQL(首选,零污染):** 写 `docker-compose.yml`:
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: smart_home_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root123456
      MYSQL_DATABASE: smart_home
      MYSQL_USER: smart
      MYSQL_PASSWORD: smart123456
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
volumes:
  mysql_data:
```
> 若目标机器没有 docker:手动装 MySQL 8,然后执行 `scripts/init_db.sql` 里的 `CREATE DATABASE smart_home CHARACTER SET utf8mb4;` 和建用户语句。README 里两种方式都写清楚。

**1.2 `.env.example`(agent 复制为 `.env`):**
```
DATABASE_URL=mysql+pymysql://smart:smart123456@127.0.0.1:3306/smart_home?charset=utf8mb4
MQTT_BROKER=broker.emqx.io
MQTT_PORT=1883
TOPIC_SUFFIX=sh7k2d          # 随机6位,避免公共broker撞车
FACE_THRESHOLD=0.40
SERVERCHAN_KEY=              # 留空则不推送,不报错
STORAGE_BACKEND=local
```

**1.3 `backend/config.py`:** 用 dotenv 读上述变量,暴露为模块级常量。

**1.4 `backend/database.py`:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**1.5 `backend/models.py` — 定义 7 张表**(MySQL 类型标注见注释):
```python
from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime,
                        ForeignKey, JSON, LargeBinary, Index, Text)
from sqlalchemy.sql import func
from .database import Base

class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    phone = Column(String(32))
    role = Column(String(16), default="guest")     # owner/family/guest
    avatar_path = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Face(Base):
    __tablename__ = "faces"
    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"))
    image_path = Column(String(255))
    embedding = Column(LargeBinary)                # np.float32.tobytes(); MySQL 映射 BLOB/MEDIUMBLOB
    created_at = Column(DateTime, server_default=func.now())

class SensorData(Base):
    __tablename__ = "sensor_data"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32))
    metric = Column(String(32))                    # temperature/humidity/light_level
    value = Column(Float)
    ts = Column(DateTime, server_default=func.now())
    __table_args__ = (Index("idx_metric_ts", "metric", "ts"),)

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), unique=True)
    name = Column(String(64))
    type = Column(String(16))                      # light/ac/fan/door/window/camera
    state = Column(JSON)                           # MySQL8 原生 JSON
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class OpLog(Base):
    __tablename__ = "op_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(32))                    # door_open/door_deny/light_on/scene_away...
    target = Column(String(32))
    operator = Column(String(64))                  # 人名 / system / face_recognition
    detail = Column(JSON)
    ts = Column(DateTime, server_default=func.now())
    __table_args__ = (Index("idx_ts", "ts"),)

class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, autoincrement=True)
    image_path = Column(String(255))
    annotated_path = Column(String(255))
    result_json = Column(JSON)
    ts = Column(DateTime, server_default=func.now())
```

**1.6 建表:** `main.py` 启动时 `Base.metadata.create_all(bind=engine)`(先临时写个最小 main 只做建表)。

**✅ STAGE 1 验证:**
```bash
docker compose up -d
sleep 15
python -c "from backend.database import engine; from backend import models; models.Base.metadata.create_all(engine); print('tables created')"
docker exec smart_home_mysql mysql -usmart -psmart123456 smart_home -e "SHOW TABLES;"
```
必须列出 7 张表。

---

## STAGE 2 — FastAPI 骨架 + 人员 CRUD

**2.1 `schemas.py`:** 写一个统一包装 `def resp(data=None, code=0, msg="ok"): return {"code": code, "msg": msg, "data": data}`。人员的 pydantic 模型 `PersonIn` / `PersonOut`。

**2.2 `main.py`:** 创建 app,加 `CORSMiddleware(allow_origins=["*"])`,挂 `/uploads` 静态目录,`include_router` 所有路由,startup 里建表。

**2.3 `routers/persons.py`:**
- `GET  /api/persons?keyword=&page=1&size=10` → 分页 + 姓名模糊搜索,返回 `{"total":N,"items":[...]}`,每项含 `face_count`(join faces 计数)。
- `POST /api/persons` → 创建。
- `GET  /api/persons/{id}` / `PUT /api/persons/{id}` / `DELETE /api/persons/{id}`。
- 头像上传:`POST /api/upload` 通用接口,存盘返回 `{"path": "/uploads/..."}`,前端先传图拿路径再提交表单。

**✅ STAGE 2 验证:**
```bash
uvicorn backend.main:app --reload &
sleep 3
curl -s -X POST localhost:8000/api/persons -H "Content-Type: application/json" -d '{"name":"张三","role":"owner","phone":"138"}'
curl -s "localhost:8000/api/persons?page=1&size=10"
```
create 返回 id、list 能查到该人即通过。打开 `localhost:8000/docs` 应看到 Swagger。

---

## STAGE 3 — YOLO 物体识别

> 参考老师文档:`model.predict(img_path, save=True, conf=..., classes=..., save_txt=True)`;`results[0].plot()` 得标注图。

**3.1 `services/yolo_service.py`:** 模块级**单例加载** `model = YOLO("models/yolov8n.pt")`(文件不存在时 ultralytics 自动下载到该路径)。函数 `def detect(image_path) -> (annotated_path, detections_list)`:
```python
results = model.predict(image_path, conf=0.4)
r = results[0]
annotated = r.plot()                 # numpy BGR
cv2.imwrite(annotated_path, annotated)
dets = [{"cls": model.names[int(b.cls)], "conf": float(b.conf), "box": b.xyxy[0].tolist()}
        for b in r.boxes]
return annotated_path, dets
```

**3.2 `routers/detect.py`:** `POST /api/detect`(multipart file)→ 存原图 → 调 detect → 存标注图 → 写 `detections` 表 → 返回 `{"image_url","annotated_url","detections":[...]}`。

**✅ STAGE 3 验证:**
```bash
# 用 ultralytics 自带样例图
python -c "from ultralytics.utils.downloads import safe_download; safe_download('https://ultralytics.com/images/bus.jpg','/tmp/bus.jpg')"
curl -s -X POST localhost:8000/api/detect -F "file=@/tmp/bus.jpg" | python -m json.tool
```
返回的 detections 里应含 person/bus。标注图文件存在。

---

## STAGE 4 — 人脸识别门禁(2真1假)

**4.1 `services/face_service.py`:**
```python
# 首选 insightface
from insightface.app import FaceAnalysis
import numpy as np
_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
_app.prepare(ctx_id=-1, det_size=(640, 640))

def get_embedding(img_path):
    import cv2
    img = cv2.imread(img_path)
    faces = _app.get(img)
    if not faces: return None
    return faces[0].normed_embedding.astype(np.float32)   # (512,)

def cosine(a, b): return float(np.dot(a, b))               # normed 向量点积即余弦
```
> insightface 首次运行会下载 buffalo_l 模型(~300MB),README 注明。装不上时降级 `face_recognition`(128维,阈值改 0.6,比较用负欧氏距离),接口签名保持一致。

**4.2 `routers/face.py`:**
- `POST /api/face/enroll`(person_id + file)→ `get_embedding` → 存 `faces` 表(embedding 用 `.tobytes()` 存 BLOB,读时 `np.frombuffer(blob, np.float32)`)。无人脸返回 `{"code":1,"msg":"未检测到人脸"}`。
- `POST /api/face/verify`(file)→ 提特征 → 遍历库中所有 face,算最高余弦 → `>= FACE_THRESHOLD` 则 `pass=true` + 该 person,写 `op_logs(door_open)`;否则 `pass=false`,写 `op_logs(door_deny)` 并调 `notify.push_stranger()`。返回带 `score`、`snapshot_url`。
- `GET  /api/face/library` → 按 person 分组列出已录入人脸(供前端人脸库管理)。
- `DELETE /api/face/{face_id}` → 删单张特征。

**✅ STAGE 4 验证(脚本化 2真1假):** 写 `scripts/test_face.py`,用 `test_data/faces/` 下 A 的两张、B 的一张、陌生人 C 一张:录入 A_1、B_1 → 验证 A_2(期望 pass)、验证 B_2(期望 pass)、验证 C(期望 deny)。脚本断言三次结果并打印。
> `test_data/faces/` 里的真人照片由**人工提供**;开发期 agent 可先用 insightface/公开测试人脸占位跑通逻辑。

---

## STAGE 5 — 设备控制、操作日志、场景

**5.1 `routers/devices.py`:**
- `GET  /api/devices` → 所有设备当前状态。
- `POST /api/devices/{device_id}/command`,body `{"action":"set","state":{"on":true,"brightness":70}}` → 更新 `devices.state`(JSON merge)→ 写 `op_logs` → 向 MQTT `home/{SUFFIX}/cmd/{device_id}` publish(为阶段2硬件预留)。

**5.2 `routers/logs.py`:** `GET /api/logs?action=&start=&end=&page=1` → 分页 + 时间/动作筛选。

**5.3 `routers/scene.py`:** `POST /api/scene/{name}`,name ∈ away/home/night。规则写成 dict:
```python
SCENES = {
  "away": [("light01",{"on":False}), ("ac01",{"on":False}), ("door01",{"locked":True})],
  "home": [("light01",{"on":True}), ("ac01",{"on":True,"temp_set":26})],
  "night":[("light01",{"on":True,"brightness":10}), ("window01",{"open":False})],
}
```
遍历执行设备更新 + 写一条 `op_logs(scene_{name})`,返回 `{"scene","changed":[...]}`。

**✅ STAGE 5 验证:**
```bash
curl -s -X POST localhost:8000/api/devices/light01/command -H "Content-Type: application/json" -d '{"action":"set","state":{"on":true,"brightness":80}}'
curl -s -X POST localhost:8000/api/scene/away
curl -s "localhost:8000/api/logs?page=1"
```
设备状态更新、场景切换、日志三条都能查到。

---

## STAGE 6 — MQTT 设备模拟器 + 订阅入库 + 高温联动

**6.1 `simulator/device_sim.py`(~50行):** 每 3 秒向 `home/{SUFFIX}/sensor/temperature` 和 `.../humidity` publish `{"device_id":"sensor01","value":26.4,"ts":"..."}`。温度用正弦(24h 周期)+ 噪声,范围 22–32°C,每约 20 次注入一次 >30°C。

**6.2 `services/mqtt_service.py`:** FastAPI startup 起后台线程,订阅 `home/{SUFFIX}/sensor/#`,收到即写 `sensor_data` 表。**联动规则:temperature > 30 → 把 `fan01` 设为 `{"on":true,"auto":true}` 并写 `op_logs(fan_auto_on)`**(呼应题目"温度过高激活风扇")。用状态位防抖,避免每条都触发。

**✅ STAGE 6 验证:**
```bash
python simulator/device_sim.py &   # 后端需已在跑
sleep 40
curl -s "localhost:8000/api/sensors/latest"
docker exec smart_home_mysql mysql -usmart -psmart123456 smart_home -e "SELECT count(*) FROM sensor_data;"
```
sensor_data 有数据、latest 返回最近值即通过。

---

## STAGE 7 — 历史查询、通知、联动控灯、seed

**7.1 `routers/sensors.py`:**
- `GET /api/sensors/latest` → 各 metric 最新值。
- `GET /api/sensors/history?metric=&start=&end=&interval=5m` → 按时间桶聚合 avg/max/min(MySQL 用 `FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(ts)/300)*300)` 之类分桶)。

**7.2 `services/notify.py`(~5行):** `push_stranger()` → 若 `SERVERCHAN_KEY` 非空,`requests.post(f"https://sctapi.ftqq.com/{KEY}.send", data={"title":"⚠️陌生人告警","desp":...})`;为空则打日志跳过,**绝不因为没配 key 而抛异常阻断主流程**。

**7.3 联动控灯:** `detect.py` 里,若识别结果含 `traffic light` 或请求带 `?linkage=1` 且有检出目标,自动把 `light01` 设 on 并写 `op_logs(linkage_light_on)`。
> 进阶(见 STAGE 9):真正的"灯泡"检测需自训练类别,COCO 无此类。

**7.4 `scripts/seed.py`:** 清库后灌入:3 个人员(1 owner + 2 family)、5 台设备初始状态、过去 24h 每 5 分钟一条温湿度、20 条混合 op_logs(含 2 open + 1 deny)。保证前端一打开就有数据。

**✅ STAGE 7 验证:**
```bash
python scripts/seed.py
curl -s "localhost:8000/api/sensors/history?metric=temperature&interval=1h" | python -m json.tool | head
curl -s "localhost:8000/api/logs?page=1"
```

---

## STAGE 8 — 收尾:README + 一键启动 + .gitignore

**8.1 `.gitignore`:**
```
__pycache__/
*.pyc
.env
backend/uploads/*
!backend/uploads/.gitkeep
models/*.pt
mysql_data/
test_data/faces/*
runs/                # yolo 训练输出
*.onnx
.venv/
```

**8.2 `README.md`** 必含:项目简介、架构图、依赖版本、**三条命令内启动**(`docker compose up -d` → `pip install -r requirements.txt` → `python scripts/seed.py && uvicorn backend.main:app`)、API 一览表、**评审演示话术**(2真1假流程、如何触发高温联动、如何演示场景模式)、已知坑(首次下模型慢、insightface 安装、公共broker撞车换 SUFFIX)。

**8.3 一键脚本** `scripts/start.sh` / `start.bat`。

**✅ STAGE 8 验证:** 在干净目录按 README 走一遍,后端起来 + `/docs` 可访问 + seed 数据在。

---

## STAGE 9 —(可选进阶)自训练"灯泡"检测,让联动控灯名副其实

> 参考老师《YoloV8训练自己的数据集》。做完这步,加分项"摄像头检测灯泡→控灯"就是真的检测灯泡,而非取巧,可作为报告里的创新点。

1. `pip install labelimg`(建议 python<3.10 的独立环境,老师文档提到高版本可能闪退)。
2. 收集 100–200 张含灯泡的图,labelimg 切 YOLO 模式标注,类别 `bulb`,输出 txt 与图片同名。
3. 建 `datasets/bulb/` 结构:`train/images`、`train/labels`、`val/images`、`val/labels`。写 `bulb.yaml`:
```yaml
train: datasets/bulb/train/images
val: datasets/bulb/val/images
nc: 1
names: ['bulb']
```
4. 训练:`yolo task=detect mode=train model=yolov8n.pt data=bulb.yaml epochs=100 imgsz=640`。
5. 产物 `runs/detect/train/weights/best.pt` → 复制到 `models/bulb.pt`。
6. `yolo_service.py` 加载第二个模型 `bulb_model = YOLO("models/bulb.pt")`,detect 时若检到 bulb 触发联动控灯。
> 阶段1时间紧可跳过,先用 STAGE 7.3 的取巧版占位,报告中说明"阶段2将替换为自训练模型"。

---

## 附:数据契约(前端对接用,与前端 mock 必须一致)

```jsonc
GET  /api/sensors/latest      -> {"data":{"temperature":26.4,"humidity":58.2,"ts":"..."}}
GET  /api/sensors/history     -> {"data":[{"ts":"...","avg":26.1,"max":26.8,"min":25.7}]}
GET  /api/devices             -> {"data":[{"device_id":"light01","name":"客厅灯","type":"light","state":{"on":true,"brightness":80}}, ...]}
POST /api/devices/{id}/command-> {"data":{"device_id":"light01","state":{"on":true,"brightness":70}}}
GET  /api/persons             -> {"data":{"total":3,"items":[{"id":1,"name":"张三","role":"owner","face_count":3,...}]}}
POST /api/detect              -> {"data":{"image_url":"...","annotated_url":"...","detections":[{"cls":"person","conf":0.92,"box":[..]}]}}
POST /api/face/verify         -> {"data":{"pass":true,"score":0.87,"person":{"id":1,"name":"张三"},"snapshot_url":"..."}}
POST /api/scene/{name}        -> {"data":{"scene":"away","changed":["light01","ac01"]}}
GET  /api/logs                -> {"data":{"total":20,"items":[{"action":"door_deny","operator":"face_recognition","detail":{"score":0.21},"ts":"..."}]}}
```

## 附:人工需提供(agent 做不了)
1. `test_data/faces/`:A、B 各 3 张 + 陌生人 C 一张真人照(演示前替换占位图)
2. Server酱 SENDKEY(https://sct.ftqq.com 微信扫码免费)→ 填 `.env`
3. (STAGE 9)灯泡图片数据集
4. 与电管/电子组确认真实传感器通信方式(MQTT/串口),阶段2据此加桥接脚本
