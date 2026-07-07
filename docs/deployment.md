# 板子部署与端到端联调指南（香橙派 8T / Ascend 310B / aarch64）

> 本文档对应 `TASK_hardware_integration.md` 的 STAGE H7。
> 全栈部署在香橙派8T上：后端 + MySQL + YOLO(CPU) + serial_bridge。

## 1. 系统准备

```bash
# MQTT broker + 串口权限
sudo apt install -y mosquitto mosquitto-clients
sudo systemctl enable --now mosquitto
sudo usermod -aG dialout $USER   # 加组后需重新登录
ls /dev/ttyUSB* /dev/ttyACM*     # 确认 Arduino 枚举名
```

## 2. MySQL（板子预装 docker）

```bash
docker compose up -d
```

## 3. Python 依赖（aarch64 现装，勿用 requirements.lock 的 x86 版）

```bash
conda activate yoloV8
pip install -r requirements.txt   # ultralytics 拉 CPU 版 aarch64 torch；insightface 可能需现场编译
```

## 4. .env 关键配置

```env
MQTT_BROKER=localhost
SERIAL_PORT=auto
SERIAL_BAUD=9600
YOLO_MODEL_PATH=models/best.pt
BACKEND_URL=http://localhost:8000
```

## 5. 模型权重（从 PC 训好拷入）

```bash
scp best.pt orangepi@<板子IP>:~/smart-home-backend/models/
```

## 6. 启动服务

```bash
docker compose up -d
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1 &
python serial_bridge.py &
```

## 7. 端到端验收清单（接真 Arduino）

| 测试项 | 预期结果 |
|--------|----------|
| Arduino 发 `TEMP,25` | GUI 仪表盘温度更新 |
| 键盘输入正确 PIN 按 `#` | MCU 直接开门(90°→4s回位)并上报 `KEY,OK` → OLED 显示 `Welcome` + 日志 `door_open` |
| 键盘错误 PIN | MCU 上报 `KEY,FAIL` → OLED `Access Denied` + 日志 `door_deny` |
| 摄像头人脸(2真1假) | 真人开门(下发 `DOOR,1`)、假人拒绝 |
| 温度 >30℃ | 风扇自动开 |
| 温度回落 <28℃ | 风扇自动关 |

## 8. 调试技巧

- `mosquitto_sub -t 'home/#'` — 观察所有 MQTT 消息
- `mosquitto_sub -t 'home/+/cmd/#'` — 观察下行命令
- serial_bridge 日志会打印所有上行/下行报文
- 串口自动探测 `/dev/ttyUSB0` → `/dev/ttyACM0`，可在 `.env` 中写死
- 无硬件时可用 `simulator/device_sim.py` 做离线演示
