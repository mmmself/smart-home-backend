<template>
  <div class="dash">
    <div class="dash-grid">
      <!-- LEFT -->
      <div class="col-l">
        <div class="sensor-row">
          <div class="sensor-card">
            <div class="sc-top">
              <span>室内温度</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e07b30" stroke-width="1.9" stroke-linecap="round"><path d="M12 3a2 2 0 0 1 2 2v8.3a4 4 0 1 1-4 0V5a2 2 0 0 1 2-2Z"/></svg>
            </div>
            <div class="sc-val" :style="{color: tempWarn}">
              {{ sensors.temperature ?? '--' }}<span class="sc-unit">°C</span>
            </div>
            <svg viewBox="0 0 120 34" preserveAspectRatio="none" class="spark"><polyline :points="tempSpark" fill="none" stroke="#e07b30" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="sensor-card">
            <div class="sc-top">
              <span>室内湿度</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="1.9" stroke-linecap="round"><path d="M12 3s6 6.4 6 11a6 6 0 1 1-12 0c0-4.6 6-11 6-11Z"/></svg>
            </div>
            <div class="sc-val">
              {{ sensors.humidity ?? '--' }}<span class="sc-unit">%</span>
            </div>
            <svg viewBox="0 0 120 34" preserveAspectRatio="none" class="spark"><polyline :points="humSpark" fill="none" stroke="#5b8def" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>

        <div class="card">
          <div class="card-title">设备控制</div>
          <!-- Light -->
          <div class="dev-row">
            <div class="dev-info">
              <span class="dev-icon" :style="{background: lightIconBg}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="lightStroke" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z"/></svg>
              </span>
              <div><div class="dev-name" style="display:flex;align-items:center;gap:6px">客厅灯<span class="logical-tag">逻辑演示</span></div><div class="dev-sub">亮度 {{ lightBr }}% · 无物理灯</div></div>
            </div>
            <div class="toggle" :class="{on: lightOn}" @click="onDevice('light01', {on: !lightOn})"><span class="toggle-knob"></span></div>
          </div>
          <input v-if="lightOn" type="range" min="0" max="100" :value="lightBr" @input="e => lightBr = +e.target.value" @change="e => { lightBr = +e.target.value; onDevice('light01', {on: true, brightness: lightBr}) }" class="slider" />

          <!-- AC -->
          <div class="dev-row">
            <div class="dev-info">
              <span class="dev-icon" :style="{background: acIconBg}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="acStroke" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="7" rx="2"/><path d="M6 16c0 1.5 1 2 2 2M11 16c0 2-1.3 3-2.5 3M17 16c0 1.5-1 2-2 2"/></svg>
              </span>
              <div><div class="dev-name">空调</div><div class="dev-sub">{{ acOn ? acTemp + '°C 制冷中' : '已关闭' }}</div></div>
            </div>
            <div v-if="acOn" class="ac-stepper">
              <button @click="acTemp > 16 ? acTemp-- : ''; onDevice('ac01', {on: true, temp_set: acTemp})" class="ac-btn">−</button>
              <span class="ac-val">{{ acTemp }}°</span>
              <button @click="acTemp < 30 ? acTemp++ : ''; onDevice('ac01', {on: true, temp_set: acTemp})" class="ac-btn">+</button>
            </div>
            <div class="toggle" :class="{on: acOn}" @click="onDevice('ac01', {on: !acOn})"><span class="toggle-knob"></span></div>
          </div>

          <!-- Fan -->
          <div class="dev-row">
            <div class="dev-info">
              <span class="dev-icon" :style="{background: fanIconBg}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="fanStroke" stroke-width="1.7" :style="{animation: fanOn ? 'fanSpin .8s linear infinite' : ''}"><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 .5-6 2-6s2.5 3 1 5M14 12c4 0 6 .5 6 2s-3 2.5-5 1M12 14c0 4-.5 6-2 6s-2.5-3-1-5M10 12c-4 0-6-.5-6-2s3-2.5 5-1"/></svg>
              </span>
              <div class="dev-name" style="display:flex;align-items:center;gap:6px">风扇<span v-if="fanAuto" class="auto-tag">自动</span></div>
            </div>
            <div class="toggle" :class="{on: fanOn}" @click="onDevice('fan01', {on: !fanOn, auto: false})"><span class="toggle-knob"></span></div>
          </div>

          <!-- Door + Window -->
          <div class="dev-two">
            <div class="dev-mini">
              <div class="dev-info" style="margin-bottom:6px">
                <span class="dev-icon-sm" style="background:#e8f5ee"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dbd7a" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="1"/></svg></span>
                <div class="dev-name">入户门</div>
              </div>
              <div class="mini-status"><span :style="{background: doorLocked ? '#2dbd7a' : '#e5544b', width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', marginRight: '4px'}"></span>{{ doorLocked ? '已锁定' : '未锁定' }}</div>
              <div class="mini-sub">最近 {{ doorLastName }} · {{ doorLastTime }}</div>
            </div>
            <div class="dev-mini">
              <div class="dev-info" style="margin-bottom:6px">
                <span class="dev-icon-sm" style="background:#fef3e8"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e07b30" stroke-width="1.7"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16"/></svg></span>
                <div class="dev-name">卧室窗</div>
              </div>
              <div class="mini-status"><span :style="{background: winOpen ? '#f2a950' : '#98a2b0', width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', marginRight: '4px'}"></span>{{ winOpen ? '已打开' : '已关闭' }}</div>
              <div class="mini-sub">只读状态</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTER -->
      <div class="col-c">
        <div class="card fp-card">
          <div class="fp-header">
            <div class="card-title">户型总览</div>
            <div class="fp-scene">{{ sceneLabel }} · 实时联动</div>
          </div>
          <svg viewBox="0 0 640 400" class="fp-svg">
            <defs>
              <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffcf7a" stop-opacity="0.9"/><stop offset="45%" stop-color="#e07b30" stop-opacity="0.4"/><stop offset="100%" stop-color="#e07b30" stop-opacity="0"/></radialGradient>
            </defs>
            <circle cx="205" cy="200" :r="glowR" fill="url(#lightGlow)" :opacity="lightOn ? 0.8 : 0" style="transition:opacity .5s ease,r .5s ease"/>
            <rect x="24" y="24" width="592" height="352" rx="8" fill="none" stroke="#d0d5dd" stroke-width="2"/>
            <line x1="392" y1="24" x2="392" y2="376" stroke="#e4e8ed" stroke-width="1.5"/>
            <line x1="392" y1="210" x2="616" y2="210" stroke="#e4e8ed" stroke-width="1.5"/>
            <line x1="616" y1="300" x2="616" y2="352" stroke="#0f141b" stroke-width="4"/>
            <text x="44" y="48" fill="#8a95a5" font-size="13" font-family="Noto Sans SC">客厅</text>
            <text x="410" y="48" fill="#8a95a5" font-size="13" font-family="Noto Sans SC">卧室</text>
            <text x="410" y="234" fill="#8a95a5" font-size="13" font-family="Noto Sans SC">门口 · 玄关</text>
            <rect x="393" y="211" width="222" height="164" fill="#e5544b" :opacity="denyFlash" style="transition:opacity"/>

            <g><circle cx="205" cy="200" r="18" fill="#ffffff" :stroke="lightRing" stroke-width="2"/><path d="M205 191a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 205 191Z" fill="none" :stroke="lightRing" stroke-width="1.6"/><text x="205" y="234" fill="#4a5568" font-size="11" text-anchor="middle" font-family="Noto Sans SC">客厅灯</text></g>
            <g><rect x="86" y="86" width="46" height="20" rx="5" fill="#ffffff" :stroke="acRing" stroke-width="2"/><path d="M96 100c0 1 .7 1.4 1.4 1.4M104 100c0 1.4-.9 2-1.7 2M112 100c0 1-.7 1.4-1.4 1.4" :stroke="acRing" stroke-width="1.3" fill="none" stroke-linecap="round"/><text x="109" y="122" fill="#4a5568" font-size="11" text-anchor="middle" font-family="Noto Sans SC">空调</text></g>
            <g><circle cx="300" cy="312" r="17" fill="#ffffff" :stroke="fanRing" stroke-width="2"/><g :style="{animation: fanOn ? 'fanSpin 1.6s linear infinite' : ''}" style="transform-origin:300px 312px"><path d="M300 312c0-6 .8-9 3-9s3.5 4.5 1.5 7.5M302 312c6 0 9 .8 9 3s-4.5 3.5-7.5 1.5" :stroke="fanRing" stroke-width="1.5" fill="none" stroke-linecap="round"/></g><text x="300" y="346" fill="#4a5568" font-size="11" text-anchor="middle" font-family="Noto Sans SC">风扇</text></g>
            <g><rect x="486" y="30" width="30" height="22" rx="3" fill="#ffffff" :stroke="winRing" stroke-width="2"/><path d="M501 30v22M486 41h30" :stroke="winRing" stroke-width="1.2"/><text x="501" y="70" fill="#4a5568" font-size="11" text-anchor="middle" font-family="Noto Sans SC">卧室窗</text></g>
            <g><rect x="582" y="300" width="18" height="52" rx="2" fill="#ffffff" :stroke="doorRing" stroke-width="2"/><circle cx="586" cy="326" r="1.6" :fill="doorRing"/><text x="560" y="292" fill="#4a5568" font-size="11" text-anchor="middle" font-family="Noto Sans SC">入户门</text></g>
          </svg>
        </div>

        <div class="card chart-card">
          <div class="chart-header">
            <div class="card-title">24 小时温湿度趋势</div>
            <div class="chart-legend">
              <span @click="legend.temp = !legend.temp" :style="{opacity: legend.temp ? 1 : .35, cursor: 'pointer'}"><span style="width:10px;height:2.5px;background:#e07b30;border-radius:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>温度 °C</span>
              <span @click="legend.hum = !legend.hum" :style="{opacity: legend.hum ? 1 : .35, cursor: 'pointer'}"><span style="width:10px;height:2.5px;background:#5b8def;border-radius:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>湿度 %</span>
            </div>
          </div>
          <svg viewBox="0 0 600 200" class="chart-svg">
            <line x1="8" y1="150" x2="592" y2="150" stroke="#e4e8ed" stroke-width="1"/>
            <line x1="8" y1="100" x2="592" y2="100" stroke="#edf0f3" stroke-width="1" stroke-dasharray="3 4"/>
            <line x1="8" y1="50" x2="592" y2="50" stroke="#edf0f3" stroke-width="1" stroke-dasharray="3 4"/>
            <polyline v-if="legend.temp" :points="chartTemp" fill="none" stroke="#e07b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline v-if="legend.hum" :points="chartHum" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="chart-ticks">
            <span>{{ chartT0 }}</span><span>{{ chartT1 }}</span><span>{{ chartT2 }}</span><span>现在</span>
          </div>
        </div>
      </div>

      <!-- RIGHT -->
      <div class="col-r">
        <div class="card event-card">
          <div class="event-header">
            <div class="card-title">实时事件流</div>
            <span class="event-poll"><span class="poll-dot"></span>5s 轮询</span>
          </div>
          <div class="event-list">
            <div v-for="ev in events" :key="ev.id" class="event-item" :style="{borderLeftColor: ev.color, animation: 'slideIn .3s ease'}">
              <span class="event-kind" :style="{color: ev.color, fontWeight: ev.bold ? 700 : 400}">{{ ev.text }}</span>
              <span class="event-time">{{ ev.time }}</span>
            </div>
            <EmptyState v-if="!events.length" icon="clock" text="暂无事件 — 等待传感器数据" />
          </div>
        </div>

        <div class="card yolo-card" @click="lastDetection ? lightbox({caption: '最近一次识别标注', src: lastDetection.annotated_url}) : null">
          <div class="card-title" style="margin-bottom:8px">最近一次识别标注</div>
          <div v-if="lastDetection" class="yolo-thumb">
            <img v-if="lastDetection.annotated_url" :src="lastDetection.annotated_url" style="width:100%;height:100%;object-fit:cover" />
          </div>
          <div v-else class="yolo-placeholder">
            <EmptyState icon="frame" text="暂无识别记录" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { api } from '../api'
import EmptyState from '../components/EmptyState.vue'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline', 'showToast', 'lightbox'])
const { showToast, setOnline, lightbox } = props

const sensors = ref({})
const devices = ref([])
const events = ref([])
const legend = reactive({ temp: true, hum: true })
const history = ref([])
const denyFlash = ref(0)
const lastDetection = ref(null)
let sensorTimer, eventTimer, historyRefreshTimer, lastSeenLogId = 0

const findDev = (id) => devices.value.find(d => d.device_id === id)?.state || {}
const lightOn = computed(() => findDev('light01').on ?? true)
const lightBr = ref(80)
const acOn = computed(() => findDev('ac01').on ?? false)
const acTemp = ref(26)
const fanOn = computed(() => findDev('fan01').on ?? false)
const fanAuto = computed(() => findDev('fan01').auto ?? false)
const doorLocked = computed(() => findDev('door01').locked ?? true)
const winOpen = computed(() => findDev('window01').open ?? false)
const doorLastName = ref('--')
const doorLastTime = ref('--')
const sceneActive = inject('sceneActive', ref(''))
const sceneLabel = computed(() => ({ away: '离家模式', home: '回家模式', night: '睡眠模式' }[sceneActive.value] || '—'))
const tempWarn = computed(() => (sensors.value.temperature || 0) > 30 ? '#e5544b' : '#1a2033')

const lightRing = computed(() => lightOn.value ? '#e07b30' : '#d0d5dd')
const lightIconBg = computed(() => lightOn.value ? '#fef3e8' : '#f5f7fa')
const lightStroke = computed(() => lightOn.value ? '#e07b30' : '#8a95a5')
const acRing = computed(() => acOn.value ? '#5b8def' : '#d0d5dd')
const acIconBg = computed(() => acOn.value ? '#e8f0fd' : '#f5f7fa')
const acStroke = computed(() => acOn.value ? '#5b8def' : '#8a95a5')
const fanRing = computed(() => fanOn.value ? '#5bd0e0' : '#d0d5dd')
const fanIconBg = computed(() => fanOn.value ? '#e8f5f6' : '#f5f7fa')
const fanStroke = computed(() => fanOn.value ? '#5bd0e0' : '#8a95a5')
const doorRing = computed(() => doorLocked.value ? '#2dbd7a' : '#e5544b')
const winRing = computed(() => winOpen.value ? '#f2a950' : '#d0d5dd')
const glowR = computed(() => lightOn.value ? 140 : 0)

const tempSpark = computed(() => {
  const pts = history.value.slice(-48).map((h, i) => `${(i/(47))*120},${34-(h.temp-20)/15*30}`)
  return pts.join(' ')
})
const humSpark = computed(() => {
  const pts = history.value.slice(-48).map((h, i) => `${(i/(47))*120},${34-(h.hum-30)/60*30}`)
  return pts.join(' ')
})

const chartData = computed(() => {
  return history.value.length ? history.value : []
})
const chartTemp = computed(() => {
  return chartData.value.map((h, i) => `${(i/(chartData.value.length-1||1))*592+8},${150-(h.temp-20)/15*100}`).join(' ')
})
const chartHum = computed(() => {
  return chartData.value.map((h, i) => `${(i/(chartData.value.length-1||1))*592+8},${150-(h.hum-30)/60*100}`).join(' ')
})
const chartT0 = computed(() => chartData.value.length > 0 ? dayjs(chartData.value[0]?.ts).format('HH:mm') : '--')
const chartT1 = computed(() => chartData.value.length > 20 ? dayjs(chartData.value[Math.floor(chartData.value.length/2)]?.ts).format('HH:mm') : '--')
const chartT2 = computed(() => chartData.value.length > 10 ? dayjs(chartData.value[Math.floor(chartData.value.length*0.75)]?.ts).format('HH:mm') : '--')

const onDevice = async (deviceId, state) => {
  try {
    await api.deviceCommand(deviceId, state)
    setOnline(true); refreshDevices()
  } catch { showToast('error', '设备控制失败') }
}

const refreshDevices = async () => {
  try { const list = await api.getDevices(); devices.value = list; setOnline(true)
    list.forEach(d => {
      if (d.device_id === 'light01') lightBr.value = d.state?.brightness ?? 80
      if (d.device_id === 'ac01') acTemp.value = d.state?.temp_set ?? 26
      if (d.device_id === 'door01') { doorLastName.value = d.last_access?.name || '--'; doorLastTime.value = d.last_access?.ts ? dayjs(d.last_access.ts).format('HH:mm') : '--' }
    })
  } catch { setOnline(false) }
}

const fetchSensors = async () => {
  try { const d = await api.sensorsLatest(); sensors.value = d; setOnline(true)
    history.value.push({ ts: d.ts || new Date().toISOString(), temp: d.temperature || 25, hum: d.humidity || 55 })
    if (history.value.length > 144) history.value = history.value.slice(-144)
  } catch { setOnline(false) }
}

const fetchHistoryInitial = async () => {
  try {
    const [tempHist, humHist] = await Promise.all([
      api.sensorsHistory({ metric: 'temperature', interval: '15m' }),
      api.sensorsHistory({ metric: 'humidity', interval: '15m' }),
    ])
    const humMap = {}
    ;(humHist || []).forEach(h => { humMap[h.ts] = h.avg })
    history.value = (tempHist || []).map(t => ({
      ts: t.ts,
      temp: t.avg,
      hum: humMap[t.ts] ?? 50,
    }))
  } catch {}
}

const fetchLastDetection = async () => {
  try {
    const r = await api.getDetections({ page: 1, size: 1 })
    if (r.items && r.items.length) lastDetection.value = r.items[0]
    else lastDetection.value = null
  } catch {}
}

const fetchEvents = async () => {
  try { const r = await api.getLogs({ page: 1, size: 8 }); setOnline(true)
    events.value = (r.items||[]).slice(0,6).map(l => {
      const isDeny = l.action === 'door_deny'; const isPass = l.action === 'door_open'
      return { id: l.id, text: (isDeny ? '门禁拒绝' : isPass ? `${l.operator} 开门通过` : actionLabel(l.action)), time: dayjs(l.ts).format('HH:mm'), color: isDeny ? '#e5544b' : isPass ? '#2dbd7a' : '#8a95a5', bold: isDeny || isPass }
    })
    const items = r.items || []
    const maxId = items.length ? Math.max(...items.map(l => l.id)) : 0
    const newDeny = items.find(l => l.action === 'door_deny' && l.id > lastSeenLogId)
    if (newDeny && lastSeenLogId > 0) { denyFlash.value = 1; setTimeout(() => denyFlash.value = 0, 2000) }
    lastSeenLogId = maxId
  } catch {}
}
const actionLabel = (a) => ({ light_on:'开灯', light_off:'关灯', fan_auto_on:'风扇自启', fan_auto_off:'风扇自停(降温)', scene_away:'离家', scene_home:'回家', scene_night:'睡眠' }[a] || a)

watch(devices, () => {
  const d = devices.value.find(d => d.device_id === 'light01'); if (d) lightBr.value = d.state?.brightness ?? 80
  const a = devices.value.find(d => d.device_id === 'ac01'); if (a) acTemp.value = a.state?.temp_set ?? 26
}, { deep: true })

onMounted(async () => {
  refreshDevices()
  await fetchHistoryInitial()
  fetchSensors(); fetchEvents(); fetchLastDetection()
  sensorTimer = setInterval(fetchSensors, 3000)
  eventTimer = setInterval(fetchEvents, 5000)
  historyRefreshTimer = setInterval(fetchHistoryInitial, 5 * 60 * 1000)
})
onUnmounted(() => { clearInterval(sensorTimer); clearInterval(eventTimer); clearInterval(historyRefreshTimer) })
</script>

<style scoped>
</style>
