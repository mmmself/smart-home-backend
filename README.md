# Smart Home Backend

智能家居数据智能系统 - 后端服务

## 技术栈

- Python 3.10+ / FastAPI / Uvicorn
- MySQL 8.0 + SQLAlchemy 2.x
- YOLOv8n (ultralytics) 目标检测
- InsightFace 人脸识别
- MQTT (paho-mqtt) 设备通信

## 快速启动

```bash
# 1. 启动 MySQL
docker compose up -d

# 2. 安装依赖
pip install -r requirements.txt

# 3. 初始化种子数据 + 启动服务
python scripts/seed.py && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

或使用一键脚本:
```bash
bash scripts/start.sh   # Linux/Mac
scripts/start.bat       # Windows
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
- `DATABASE_URL`: MySQL连接串
- `MQTT_BROKER`: MQTT broker地址
- `TOPIC_SUFFIX`: MQTT主题后缀(避免公共broker撞车)
- `FACE_THRESHOLD`: 人脸识别阈值(默认0.40)
- `SERVERCHAN_KEY`: Server酱推送key(可选)

## 目录结构

```
smart-home-backend/
├── docker-compose.yml
├── .env.example
├── requirements.txt
├── backend/
│   ├── main.py              # FastAPI入口
│   ├── config.py             # 配置读取
│   ├── database.py           # 数据库连接
│   ├── models.py             # 7张表ORM
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
│   │   ├── yolo_service.py
│   │   ├── face_service.py
│   │   ├── mqtt_service.py
│   │   └── notify.py
│   └── uploads/
├── simulator/
│   └── device_sim.py         # MQTT设备模拟器
├── scripts/
│   ├── init_db.sql
│   ├── seed.py               # 种子数据
│   ├── torch_check.py
│   ├── test_face.py
│   └── start.sh / start.bat
└── models/                   # 模型文件(yolov8n.pt等)
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
4. 查看 GET /api/logs?action=fan_auto_on 可看到联动日志

### 场景模式
1. POST /api/scene/home → 开灯、开空调26°C
2. POST /api/scene/away → 关灯、关空调、锁门
3. POST /api/scene/night → 灯光10%亮度、关窗

## 已知坑

- YOLOv8n模型首次加载需下载~6MB,请保持网络通畅
- InsightFace buffalo_l 模型首次运行需下载~300MB
- 公共MQTT broker (broker.emqx.io) 可能撞车,修改 `.env` 中的 `TOPIC_SUFFIX` 即可
- `.env` 和 `models/*.pt` 已在 `.gitignore` 中排除
