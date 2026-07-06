<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>监控大屏</h1>
        <span class="sub">实时家居状态</span>
      </div>
      <div class="header-right">
        <span class="clock">{{ clock }}</span>
        <div class="scene-btns">
          <el-button size="small" @click="doScene('away')" :type="activeScene==='away'?'warning':'default'" plain>离家</el-button>
          <el-button size="small" @click="doScene('home')" :type="activeScene==='home'?'success':'default'" plain>回家</el-button>
          <el-button size="small" @click="doScene('night')" :type="activeScene==='night'?'info':'default'" plain>睡眠</el-button>
        </div>
      </div>
    </header>

    <div class="dash-grid">
      <!-- Sensor Cards -->
      <div class="sensor-row">
        <div class="sensor-card" :class="{ warn: sensors.temperature > 30 }">
          <div class="sensor-label">温度</div>
          <div class="sensor-value">{{ sensors.temperature ?? '--' }}°C</div>
          <div class="sensor-time">{{ sensors.ts ? formatTime(sensors.ts) : '暂无数据' }}</div>
        </div>
        <div class="sensor-card">
          <div class="sensor-label">湿度</div>
          <div class="sensor-value">{{ sensors.humidity ?? '--' }}%</div>
          <div class="sensor-time">{{ sensors.ts ? formatTime(sensors.ts) : '暂无数据' }}</div>
        </div>
      </div>

      <!-- Device Cards -->
      <div class="section-title">设备状态</div>
      <div class="device-grid">
        <div v-for="d in devices" :key="d.device_id" class="device-card">
          <div class="device-icon">{{ deviceIcon(d.type) }}</div>
          <div class="device-info">
            <div class="device-name">{{ d.name }}</div>
            <div class="device-type">{{ d.type }}</div>
          </div>
          <div class="device-actions">
            <template v-if="d.type === 'light'">
              <el-switch :model-value="d.state?.on" @change="v => toggleDevice(d.device_id, { on: v })" />
              <el-slider v-if="d.state?.on" :model-value="d.state?.brightness||80" @change="v => toggleDevice(d.device_id, { on: true, brightness: v })" :min="0" :max="100" style="width:80px;margin-left:8px" />
            </template>
            <template v-else-if="d.type === 'ac'">
              <el-switch :model-value="d.state?.on" @change="v => toggleDevice(d.device_id, { on: v })" />
              <span v-if="d.state?.on" style="margin-left:8px;font-size:13px;color:#8b95a3">{{ d.state?.temp_set }}°C</span>
            </template>
            <template v-else-if="d.type === 'fan'">
              <el-switch :model-value="d.state?.on" @change="v => toggleDevice(d.device_id, { on: v })" />
              <el-tag v-if="d.state?.auto" size="small" type="warning" effect="dark">自动</el-tag>
            </template>
            <template v-else-if="d.type === 'door'">
              <el-tag :type="d.state?.locked ? 'danger' : 'success'" size="small">{{ d.state?.locked ? '已锁' : '已开' }}</el-tag>
            </template>
            <template v-else-if="d.type === 'window'">
              <el-tag :type="d.state?.open ? 'warning' : 'info'" size="small">{{ d.state?.open ? '已开' : '已关' }}</el-tag>
            </template>
          </div>
        </div>
      </div>

      <!-- Event Stream -->
      <div class="section-title">实时事件</div>
      <div class="event-list">
        <div v-for="log in recentLogs" :key="log.id" class="event-item" :class="eventClass(log.action)">
          <span class="event-tag">{{ actionLabel(log.action) }}</span>
          <span>{{ log.operator }}</span>
          <span class="event-time">{{ formatTime(log.ts) }}</span>
        </div>
        <div v-if="!recentLogs.length" class="empty-text">暂无事件</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const clock = ref('')
const activeScene = ref('')
const sensors = ref({})
const devices = ref([])
const recentLogs = ref([])
let timer = null

const formatTime = (t) => t ? dayjs(t).format('HH:mm:ss') : ''
const deviceIcon = (t) => ({ light: '💡', ac: '❄️', fan: '🌀', door: '🚪', window: '🪟' }[t] || '📦')
const actionLabel = (a) => ({ door_open: '开门通过', door_deny: '门禁拒绝', light_on: '开灯', light_off: '关灯', fan_auto_on: '风扇自启', scene_away: '离家', scene_home: '回家', scene_night: '睡眠' }[a] || a)
const eventClass = (a) => a === 'door_deny' ? 'event-deny' : a === 'door_open' ? 'event-pass' : ''

const doScene = async (name) => {
  activeScene.value = name
  await api.activateScene(name)
  fetchDevices()
  ElMessage.success(`已切换至${name==='away'?'离家':name==='home'?'回家':'睡眠'}模式`)
}

const toggleDevice = async (deviceId, state) => {
  await api.deviceCommand(deviceId, state)
  fetchDevices()
}

const fetchAll = async () => {
  try { sensors.value = await api.sensorsLatest() } catch {}
  try { recentLogs.value = (await api.getLogs({ page: 1, size: 8 })).items || [] } catch {}
}
const fetchDevices = async () => {
  try { devices.value = await api.getDevices() } catch {}
}

onMounted(() => {
  fetchAll(); fetchDevices()
  timer = setInterval(fetchAll, 3000)
  setInterval(() => { clock.value = dayjs().format('HH:mm:ss') }, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page { padding:24px 28px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
.page-header h1 { margin:0; font-size:18px; font-weight:700; }
.sub { font-size:12px; color:#6b7686; }
.header-right { display:flex; align-items:center; gap:14px; }
.clock { font-family:'JetBrains Mono',monospace; font-size:19px; font-weight:500; letter-spacing:.5px; }
.scene-btns { display:flex; gap:4px; }
.dash-grid { display:flex; flex-direction:column; gap:20px; }
.sensor-row { display:flex; gap:16px; }
.sensor-card { flex:1; background:#151b24; border:1px solid #1e2530; border-radius:12px; padding:20px; }
.sensor-card.warn { border-color:#f87171; }
.sensor-label { font-size:12px; color:#6b7686; margin-bottom:6px; }
.sensor-value { font-size:36px; font-weight:700; font-family:'JetBrains Mono',monospace; }
.sensor-value { font-size:36px; font-weight:700; font-family:'JetBrains Mono',monospace; }
.sensor-time { font-size:11px; color:#6b7686; margin-top:4px; }
.section-title { font-size:13px; font-weight:600; color:#8b95a3; margin-top:8px; }
.device-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
.device-card { background:#151b24; border:1px solid #1e2530; border-radius:10px; padding:14px 16px; display:flex; align-items:center; gap:14px; }
.device-icon { font-size:26px; }
.device-info { flex:1; }
.device-name { font-size:14px; font-weight:600; }
.device-type { font-size:11px; color:#6b7686; }
.device-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.event-list { background:#151b24; border:1px solid #1e2530; border-radius:10px; padding:8px 0; max-height:240px; overflow-y:auto; }
.event-item { display:flex; align-items:center; gap:10px; padding:8px 16px; font-size:13px; animation:slideIn .3s; }
.event-item.event-pass { color:#34d399; }
.event-item.event-deny { color:#f87171; }
.event-tag { font-size:11px; background:#1e2530; padding:2px 8px; border-radius:4px; }
.event-time { margin-left:auto; font-size:11px; color:#6b7686; }
.empty-text { text-align:center; padding:30px; color:#6b7686; font-size:13px; }
@keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
</style>
