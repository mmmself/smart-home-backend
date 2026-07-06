# 智能家居数据智能系统 · 前端构建规格

> 对接后端 `smart-home-backend`，后端已运行于 `http://localhost:8000`，Swagger 文档在 `/docs`。

---

## 技术栈建议

| 项 | 推荐 | 备选 |
|----|------|------|
| 框架 | Vue 3 + Vite | React + Vite |
| UI 库 | Element Plus | Ant Design Vue / Naive UI |
| HTTP | axios | fetch |
| 图表 | ECharts | Chart.js |
| 地图/大屏 | DataV / 纯 CSS | — |
| MQTT(实时) | mqtt.js | paho-mqtt (浏览器) |

---

## 数据契约（所有接口均在后端已实现且验证通过）

### 响应格式：统一包装
```json
{"code": 0, "msg": "ok", "data": ...}
```
- `code=0` 成功，`code!=0` 失败，`msg` 含错误描述。

---

## 页面清单（建议 6 个页面）

### 1. 首页/大屏 Dashboard
- 实时传感器卡片（温度、湿度、光照）
- 设备状态面板（灯/空调/风扇/门窗/门锁）
- 最近操作日志滚动列表
- 人脸门禁状态（最近一次开门/拒门）

**对接接口：**
```
GET  /api/sensors/latest    → {"data":{"temperature":26.4,"humidity":58.2,"ts":"..."}}
GET  /api/devices           → {"data":[{device_id, name, type, state, updated_at}, ...]}
GET  /api/logs?page=1&size=5 → {"data":{"total":20,"items":[...]}}
```

### 2. 人员管理
- 表格：分页人员列表（含人脸数量）
- 搜索框：按姓名搜索
- 弹窗：新增/编辑人员（姓名、手机、角色、头像上传）
- 删除人员
- 头像上传

**对接接口：**
```
GET    /api/persons?keyword=&page=1&size=10
POST   /api/persons          → body: {name, phone, role, avatar_path}
GET    /api/persons/{id}
PUT    /api/persons/{id}     → body: {name?, phone?, role?, avatar_path?}
DELETE /api/persons/{id}
POST   /api/upload           → multipart file → {"data":{"path":"/uploads/..."}}
```

### 3. 人脸库管理
- 人员树形列表（人员名 → 已录入人脸缩略图）
- 录入人脸：选人员 + 上传照片
- 人脸验证测试：上传照片 → 显示 pass/deny + 匹配分数 + 匹配人名
- 删除某张人脸

**对接接口：**
```
POST   /api/face/enroll?person_id=1   → multipart file
POST   /api/face/verify               → multipart file
GET    /api/face/library              → {"data":[{person_id, name, faces:[{id, image_path, created_at}]}]}
DELETE /api/face/{face_id}
```

**验证响应示例：**
```json
{"code":0,"msg":"ok","data":{
  "pass": true,
  "score": 0.87,
  "person": {"id":1,"name":"张三"},
  "snapshot_url": "/uploads/20260706/abc123.jpg"
}}
```
- `pass=true` 显示绿色"通过" + 人名
- `pass=false` 显示红色"拒门" + 分数

### 4. 物体检测
- 上传图片
- 显示原图 + 标注图（YOLO 返回 annotated_url）
- 检测结果列表（类别、置信度、位置框）
- 联动控灯开关（linkage 参数）

**对接接口：**
```
POST /api/detect              → multipart file (可选 ?linkage=1)
```

**响应示例：**
```json
{"code":0,"msg":"ok","data":{
  "image_url": "/uploads/20260706/origin.jpg",
  "annotated_url": "/uploads/20260706/origin_annotated.jpg",
  "detections": [
    {"cls": "person", "conf": 0.92, "box": [x1,y1,x2,y2]},
    {"cls": "bus", "conf": 0.85, "box": [x1,y1,x2,y2]}
  ]
}}
```
- 标注图上直接画了框，直接用 `<img>` 展示
- 下方列表展示 detections 数组

### 5. 设备控制 + 场景
- 设备卡片列表（图标+名称+类型+开关/滑块）
- 灯光：开关 + 亮度滑块
- 空调：开关 + 温度设置
- 风扇：开关 + 自动/手动
- 门锁：开锁/锁闭
- 场景快捷按钮：离家/回家/睡眠
- 场景执行后刷新设备状态

**对接接口：**
```
GET   /api/devices                        → 设备列表
POST  /api/devices/{device_id}/command    → body: {action:"set", state:{"on":true,"brightness":70}}
POST  /api/scene/away                     → 离家模式
POST  /api/scene/home                     → 回家模式
POST  /api/scene/night                    → 睡眠模式
```

**场景行为（后端已定义）：**
| 场景 | light01 | ac01 | door01 | window01 |
|------|---------|------|--------|----------|
| home | on      | on, 26°C | — | — |
| away | off     | off  | locked | — |
| night| on, 10% | —    | — | closed |

### 6. 历史数据
- 传感器历史折线图（温度/湿度，可选时间范围）
- 操作日志表格（分页 + 按动作筛选 + 时间范围）
- YOLO 检测历史列表（缩略图+检测结果）

**对接接口：**
```
GET /api/sensors/history?metric=temperature&start=...&end=...&interval=1h
GET /api/logs?action=door_open&start=...&end=...&page=1&size=20
```

**传感器历史响应格式：**
```json
{"data":[
  {"ts":"2026-07-06T08:00:00","avg":26.1,"max":26.8,"min":25.7},
  {"ts":"2026-07-06T09:00:00","avg":26.5,"max":27.1,"min":25.9}
]}
```

---

## MQTT 实时数据（可选加分项）

后端运行时会订阅 `home/{TOPIC_SUFFIX}/sensor/#`，前端可通过 mqtt.js 直连 `broker.emqx.io:1883` 订阅相同主题，实现传感器数据实时刷新，无需轮询。

```js
// 前端 MQTT 连接示例
import mqtt from 'mqtt'
const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt')
client.subscribe('home/sh7k2d/sensor/+')
client.on('message', (topic, msg) => {
  const data = JSON.parse(msg)
  // data: {device_id, value, ts} — 实时更新 Dashboard 传感器卡片
})
```

---

## 开发流程建议

```
smart-home/
├── backend/      ← 已完成的Python后端
├── frontend/     ← 你要新建的Vue工程
├── README.md     ← 顶层总说明
└── docs/         ← 报告、甘特图
```

```bash
cd smart-home-backend
cd ..
npm create vite@latest frontend -- --template vue
cd frontend
npm install axios element-plus @element-plus/icons-vue echarts
npm run dev
```

## 接口代理配置（vite.config.js）

```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    }
  }
}
```

这样前端开发时 `axios.get('/api/persons')` 自动转发到后端 8000 端口，避免跨域问题。
