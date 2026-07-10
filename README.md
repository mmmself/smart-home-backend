# Smart Home Backend

智能家居数据智能系统 - 后端服务

## 技术栈

- Python / FastAPI / Uvicorn
- MySQL 8.0 + SQLAlchemy 2.x
- YOLOv8n (ultralytics) 目标检测
- InsightFace 人脸识别
- MQTT (paho-mqtt) 设备通信

## 快速启动

### 首次初始化

```bash
# 1. 启动 MySQL
docker compose up -d

# 2. 安装依赖
pip install -r requirements.txt

# 3. 下载 AI 模型 (YOLOv8n + InsightFace)
python scripts/download_models.py

# 4. 初始化种子数据 (会清库！加 --force 确认)
python scripts/seed.py --force

# 5. 启动后端服务 (必须单 worker)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 日常启动

```bash
docker compose up -d
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1
```

> **⚠️ 必须 `--workers 1`**: embedding 缓存、风扇自动状态、MQTT client 都是进程级状态,多 worker 会导致状态不一致。

或使用一键脚本:
```bash
bash scripts/start.sh   # Linux/Mac
scripts/start.bat       # Windows
```

### 摄像头采集 (可选)

```bash
# 定时拍照 → 目标检测
python scripts/capture_client.py --mode detect --interval 10

# 单次拍照 → 人脸验证
python scripts/capture_client.py --mode verify --once
```

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/persons | 人员列表(分页+搜索) |
| POST | /api/persons | 创建人员 |
| GET | /api/persons/{id} | 人员详情 |
| PUT | /api/persons/{id} | 更新人员 |
| DELETE | /api/persons/{id} | 删除人员 |
| POST | /api/upload | 通用文件上传 |
| POST | /api/detect | YOLO目标检测 |
| POST | /api/face/enroll | 人脸录入 |
| POST | /api/face/verify | 人脸验证 |
| GET | /api/face/library | 人脸库列表 |
| DELETE | /api/face/{id} | 删除人脸 |
| GET | /api/devices | 设备列表 |
| POST | /api/devices/{id}/command | 设备控制 |
| GET | /api/logs | 操作日志 |
| POST | /api/scene/{name} | 场景模式(away/home/night) |
| GET | /api/sensors/latest | 最新传感器数据 |
| GET | /api/sensors/history | 传感器历史(聚合) |

服务启动后访问 http://localhost:8000/docs 查看 Swagger 文档。

## 配置

复制 `.env.example` 为 `.env`,按需修改:

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | - | MySQL连接串 |
| `MQTT_BROKER` | localhost | MQTT broker地址(部署时用本地mosquitto) |
| `MQTT_PORT` | 1883 | MQTT端口 |
| `TOPIC_SUFFIX` | sh7k2d | MQTT主题后缀 |
| `FACE_THRESHOLD` | 0.40 | 人脸识别阈值 |
| `FAN_AUTO_ON_TEMP` | 30 | 风扇自动开启温度 |
| `FAN_AUTO_OFF_TEMP` | 28 | 风扇自动关闭温度 |
| `LINKAGE_CLASS` | traffic light | YOLO联动目标类别 |
| `YOLO_MODEL_PATH` | models/yolov8n.pt | YOLO模型路径 |
| `INSIGHTFACE_ROOT` | models/insightface | InsightFace模型目录 |
| `INSIGHTFACE_NAME` | buffalo_l | InsightFace模型名称 |
| `API_KEY` | (空) | API密钥(留空则不鉴权) |
| `CORS_ORIGINS` | localhost:5173,3000 | 允许的前端来源 |
| `SERVERCHAN_KEY` | (空) | Server酱推送key(可选) |

## 目录结构

```
smart-home-backend/
├── docker-compose.yml
├── .env.example
├── requirements.txt
├── requirements.lock        # 依赖版本锁定
├── backend/
│   ├── main.py              # FastAPI入口
│   ├── config.py             # 配置读取
│   ├── database.py           # 数据库连接
│   ├── models.py             # ORM模型
│   ├── schemas.py            # Pydantic模型
│   ├── routers/              # API路由
│   │   ├── persons.py
│   │   ├── detect.py
│   │   ├── face.py
│   │   ├── devices.py
│   │   ├── logs.py
│   │   ├── scene.py
│   │   └── sensors.py
│   ├── services/             # 业务服务
│   │   ├── device_service.py # 统一设备状态+MQTT
│   │   ├── yolo_service.py
│   │   ├── face_service.py
│   │   ├── mqtt_service.py
│   │   ├── notify.py
│   │   └── upload.py
│   └── uploads/
├── simulator/
│   └── device_sim.py         # MQTT设备模拟器
├── scripts/
│   ├── init_db.sql
│   ├── seed.py               # 种子数据(--force确认)
│   ├── download_models.py    # 模型离线下载
│   ├── capture_client.py     # 摄像头采集客户端
│   ├── torch_check.py
│   ├── test_face.py
│   └── start.sh / start.bat
└── models/                   # 模型文件
    ├── yolov8n.pt
    └── insightface/          # download_models.py 下载
```

## 评审演示话术

### 2真1假人脸门禁
1. 通过 POST /api/persons 创建人员A、B
2. 通过 POST /api/face/enroll 录入A_1、B_1的人脸
3. 通过 POST /api/face/verify 依次验证A_2(期望pass)、B_2(期望pass)、陌生人C(期望deny)
4. 查看 GET /api/logs 可看到 door_open 和 door_deny 记录

### 高温联动
1. 启动后端服务
2. 运行 `python simulator/device_sim.py` 启动传感器模拟器
3. 约1分钟后温度达到30°C,触发风扇自动开启
4. 温度回落后风扇自动关闭
5. 查看 GET /api/logs?action=fan_auto_on / fan_auto_off 可看到联动日志

### 场景模式
1. POST /api/scene/home → 开灯、开空调26°C
2. POST /api/scene/away → 关灯、关空调、锁门
3. POST /api/scene/night → 灯光10%亮度、关窗

## 已知坑

- InsightFace buffalo_l 模型需 `python scripts/download_models.py` 下载(~300MB)
- 部署到 ARM 板时 `requirements.lock` 需重新生成(aarch64 wheel 不同)
- 公共 MQTT broker 仅用于开发,部署时请用本地 mosquitto
