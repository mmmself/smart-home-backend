# 串口协议契约

> 本文件是 Arduino MCU 与香橙派板子（后端）之间串口通信的锚点。
> 硬件组已确认的事实见 `TASK_hardware_integration.md`，本契约据此实现。

## 统一规则

- **波特率**：9600 8N1（不是 115200）
- **格式**：一行一条报文，ASCII，`\n` 结尾
- **字段分隔**：逗号分隔
- **心跳**：无，桥不依赖心跳

## 上行（Arduino → 板子）

```text
TEMP,<int>      # DHT11 温度℃，每2s，如 TEMP,25
HUMI,<int>      # DHT11 湿度%，如 HUMI,50（有则发，喂给湿度图表）
KEY,OK          # 键盘PIN校验通过（MCU已开门）
KEY,FAIL        # 键盘PIN校验失败
```

### 说明

- `TEMP` / `HUMI`：DHT11 整数精度 ±2℃，2s 采样。温度/湿度均为整数。
- `KEY,OK` / `KEY,FAIL`：MCU 本地缓存按键数字，用户按 `#` 后本地校验 PIN，
  校验通过发 `KEY,OK`（同时 MCU 已驱动舵机开门），失败发 `KEY,FAIL`。
  按 `*` 清空缓存。**后端不再接收明文密码，仅记录门禁事件。**

## 下行（板子 → Arduino）

```text
FAN,<0|1>       # 风扇 关/开
DOOR,1          # 开门一次（舵机→90°，MCU 4s后自动回0°）；板子永不发 DOOR,0
OLED,<text>     # OLED显示英文文本，≤21字符/行；可用 | 分隔多行，如 OLED,Welcome|Tom
```

### 说明

- `FAN`：仅开关（H桥 INA=D4/INB=D5），无调速。
- `DOOR,1`：开门为**瞬时动作**，板子只发 `DOOR,1`，**永不发 `DOOR,0**。
  MCU 收到后舵机转 90°，开门后 4s 自动回 0°。
- `OLED`：SSD1306 OLED 128×64，SPI，**仅英文**，每行约 21 字符。
  多行用 `|` 分隔。内容必须 ASCII。

## 串口枚举

- `/dev/ttyUSB0`（CH340 桥芯）
- `/dev/ttyACM0`（原装 Arduino Uno）
- `SERIAL_PORT=auto` 时依次尝试上述两个端口。
