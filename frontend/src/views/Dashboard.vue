<template>
  <div class="dash">
    <div class="dash-grid">
      <!-- LEFT -->
      <div class="col-l">
        <div class="sensor-row">
          <div class="sensor-card">
            <div class="sc-top">
              <span>室内温度</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f2a950" stroke-width="1.9" stroke-linecap="round"><path d="M12 3a2 2 0 0 1 2 2v8.3a4 4 0 1 1-4 0V5a2 2 0 0 1 2-2Z"/></svg>
            </div>
            <div class="sc-val" :style="{color:tempWarn}">
              {{ sensors.temperature ?? '--' }}<span class="sc-unit">°C</span>
            </div>
            <svg viewBox="0 0 120 34" preserveAspectRatio="none" class="spark"><polyline :points="tempSpark" fill="none" stroke="#f2a950" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
              <span class="dev-icon" :style="{background:lightIconBg}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="lightStroke" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z"/></svg>
              </span>
              <div><div class="dev-name">客厅灯</div><div class="dev-sub">亮度 {{ lightBr }}%</div></div>
            </div>
            <div class="toggle" :class="{on:lightOn}" @click="onDevice('light01',{on:!lightOn})"><span class="toggle-knob"></span></div>
          </div>
          <input v-if="lightOn" type="range" min="0" max="100" :value="lightBr" @input="e=>lightBr=+e.target.value" @change="e=>{lightBr=+e.target.value;onDevice('light01',{on:true,brightness:lightBr})}" class="slider" />

          <!-- AC -->
          <div class="dev-row">
            <div class="dev-info">
              <span class="dev-icon" :style="{background:acIconBg}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="acStroke" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="7" rx="2"/><path d="M6 16c0 1.5 1 2 2 2M11 16c0 2-1.3 3-2.5 3M17 16c0 1.5-1 2-2 2"/></svg>
              </span>
              <div><div class="dev-name">空调</div><div class="dev-sub">{{ acOn ? acTemp+'°C 制冷中' : '已关闭' }}</div></div>
            </div>
            <div v-if="acOn" class="ac-stepper">
              <button @click="acTemp>16?acTemp--:'';onDevice('ac01',{on:true,temp_set:acTemp})" class="ac-btn">−</button>
              <span class="ac-val">{{ acTemp }}°</span>
              <button @click="acTemp<30?acTemp++:'';onDevice('ac01',{on:true,temp_set:acTemp})" class="ac-btn">+</button>
            </div>
            <div class="toggle" :class="{on:acOn}" @click="onDevice('ac01',{on:!acOn})"><span class="toggle-knob"></span></div>
          </div>

          <!-- Fan -->
          <div class="dev-row">
            <div class="dev-info">
              <span class="dev-icon" :style="{background:fanIconBg}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="fanStroke" stroke-width="1.7" :style="{animation:fanOn?'fanSpin .8s linear infinite':''}"><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 .5-6 2-6s2.5 3 1 5M14 12c4 0 6 .5 6 2s-3 2.5-5 1M12 14c0 4-.5 6-2 6s-2.5-3-1-5M10 12c-4 0-6-.5-6-2s3-2.5 5-1"/></svg>
              </span>
              <div class="dev-name" style="display:flex;align-items:center;gap:6px">风扇<span v-if="fanAuto" class="auto-tag">自动</span></div>
            </div>
            <div class="toggle" :class="{on:fanOn}" @click="onDevice('fan01',{on:!fanOn})"><span class="toggle-knob"></span></div>
          </div>

          <!-- Door + Window -->
          <div class="dev-two">
            <div class="dev-mini">
              <div class="dev-info" style="margin-bottom:6px">
                <span class="dev-icon-sm" style="background:#182a22"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#46b98a" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="1"/></svg></span>
                <div class="dev-name">入户门</div>
              </div>
              <div class="mini-status"><span :style="{background:doorLocked?'#46b98a':'#e5544b',width:'7px',height:'7px',borderRadius:'50%',display:'inline-block',marginRight:'4px'}"></span>{{ doorLocked ? '已锁定' : '未锁定' }}</div>
              <div class="mini-sub">最近 {{ doorLastName }} · {{ doorLastTime }}</div>
            </div>
            <div class="dev-mini">
              <div class="dev-info" style="margin-bottom:6px">
                <span class="dev-icon-sm" style="background:#1c232e"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98a2b0" stroke-width="1.7"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16"/></svg></span>
                <div class="dev-name">卧室窗</div>
              </div>
              <div class="mini-status"><span :style="{background:winOpen?'#f2a950':'#98a2b0',width:'7px',height:'7px',borderRadius:'50%',display:'inline-block',marginRight:'4px'}"></span>{{ winOpen ? '已打开' : '已关闭' }}</div>
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
              <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffcf7a" stop-opacity="0.9"/><stop offset="45%" stop-color="#f2a950" stop-opacity="0.4"/><stop offset="100%" stop-color="#f2a950" stop-opacity="0"/></radialGradient>
            </defs>
            <circle cx="205" cy="200" :r="glowR" fill="url(#lightGlow)" :opacity="lightOn?0.8:0" style="transition:opacity .5s ease,r .5s ease"/>
            <rect x="24" y="24" width="592" height="352" rx="8" fill="none" stroke="#3a4757" stroke-width="2"/>
            <line x1="392" y1="24" x2="392" y2="376" stroke="#2c3542" stroke-width="1.5"/>
            <line x1="392" y1="210" x2="616" y2="210" stroke="#2c3542" stroke-width="1.5"/>
            <line x1="616" y1="300" x2="616" y2="352" stroke="#0f141b" stroke-width="4"/>
            <text x="44" y="48" fill="#5b6675" font-size="13" font-family="Noto Sans SC">客厅</text>
            <text x="410" y="48" fill="#5b6675" font-size="13" font-family="Noto Sans SC">卧室</text>
            <text x="410" y="234" fill="#5b6675" font-size="13" font-family="Noto Sans SC">门口 · 玄关</text>
            <rect x="393" y="211" width="222" height="164" fill="#e5544b" :opacity="denyFlash" style="transition:opacity"/>

            <g><circle cx="205" cy="200" r="18" fill="#141a23" :stroke="lightRing" stroke-width="2"/><path d="M205 191a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 205 191Z" fill="none" :stroke="lightRing" stroke-width="1.6"/><text x="205" y="234" fill="#8b95a3" font-size="11" text-anchor="middle" font-family="Noto Sans SC">客厅灯</text></g>
            <g><rect x="86" y="86" width="46" height="20" rx="5" fill="#141a23" :stroke="acRing" stroke-width="2"/><path d="M96 100c0 1 .7 1.4 1.4 1.4M104 100c0 1.4-.9 2-1.7 2M112 100c0 1-.7 1.4-1.4 1.4" :stroke="acRing" stroke-width="1.3" fill="none" stroke-linecap="round"/><text x="109" y="122" fill="#8b95a3" font-size="11" text-anchor="middle" font-family="Noto Sans SC">空调</text></g>
            <g><circle cx="300" cy="312" r="17" fill="#141a23" :stroke="fanRing" stroke-width="2"/><g :style="{animation:fanOn?'fanSpin 1.6s linear infinite':''}" style="transform-origin:300px 312px"><path d="M300 312c0-6 .8-9 3-9s3.5 4.5 1.5 7.5M302 312c6 0 9 .8 9 3s-4.5 3.5-7.5 1.5" :stroke="fanRing" stroke-width="1.5" fill="none" stroke-linecap="round"/></g><text x="300" y="346" fill="#8b95a3" font-size="11" text-anchor="middle" font-family="Noto Sans SC">风扇</text></g>
            <g><rect x="486" y="30" width="30" height="22" rx="3" fill="#141a23" :stroke="winRing" stroke-width="2"/><path d="M501 30v22M486 41h30" :stroke="winRing" stroke-width="1.2"/><text x="501" y="70" fill="#8b95a3" font-size="11" text-anchor="middle" font-family="Noto Sans SC">卧室窗</text></g>
            <g><rect x="582" y="300" width="18" height="52" rx="2" fill="#141a23" :stroke="doorRing" stroke-width="2"/><circle cx="586" cy="326" r="1.6" :fill="doorRing"/><text x="560" y="292" fill="#8b95a3" font-size="11" text-anchor="middle" font-family="Noto Sans SC">入户门</text></g>
          </svg>
        </div>

        <div class="card chart-card">
          <div class="chart-header">
            <div class="card-title">24 小时温湿度趋势</div>
            <div class="chart-legend">
              <span @click="legend.temp=!legend.temp" :style="{opacity:legend.temp?1:.35,cursor:'pointer'}"><span style="width:10px;height:2.5px;background:#f2a950;border-radius:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>温度 °C</span>
              <span @click="legend.hum=!legend.hum" :style="{opacity:legend.hum?1:.35,cursor:'pointer'}"><span style="width:10px;height:2.5px;background:#5b8def;border-radius:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>湿度 %</span>
            </div>
          </div>
          <svg viewBox="0 0 600 200" class="chart-svg">
            <line x1="8" y1="150" x2="592" y2="150" stroke="#232c39" stroke-width="1"/>
            <line x1="8" y1="100" x2="592" y2="100" stroke="#1c2531" stroke-width="1" stroke-dasharray="3 4"/>
            <line x1="8" y1="50" x2="592" y2="50" stroke="#1c2531" stroke-width="1" stroke-dasharray="3 4"/>
            <polyline v-if="legend.temp" :points="chartTemp" fill="none" stroke="#f2a950" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
            <div v-for="ev in events" :key="ev.id" class="event-item" :style="{borderLeftColor:ev.color,animation:'slideIn .3s ease'}">
              <span class="event-kind" :style="{color:ev.color,fontWeight:ev.bold?700:400}">{{ ev.text }}</span>
              <span class="event-time">{{ ev.time }}</span>
            </div>
            <div v-if="!events.length" class="event-empty">暂无事件 — 等待传感器数据</div>
          </div>
        </div>

        <div class="card yolo-card" @click="lightbox({caption:'最近一次识别标注'})">
          <div class="card-title" style="margin-bottom:8px">最近一次识别标注</div>
          <div class="yolo-placeholder">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#3a4757" stroke-width="1.2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2"/></svg>
            <div class="yolo-box" style="left:22%;top:14%;width:34%;height:70%;border:2px solid #46b98a;border-radius:4px"><span style="position:absolute;top:-19px;left:-1px;background:#46b98a;color:#08130d;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px 4px 4px 0">人 0.92</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline', 'showToast', 'lightbox'])
const { showToast, setOnline, lightbox } = props

const sensors = ref({})
const devices = ref([])
const events = ref([])
const legend = reactive({ temp: true, hum: true })
const history = ref([])
const denyFlash = ref(0)
let sensorTimer, eventTimer, _evN = 0

// Device state accessors
const findDev = (id) => devices.value.find(d => d.device_id === id)?.state || {}
const lightOn = computed(() => findDev('light01').on ?? true)
const lightBr = ref(80)
const acOn = computed(() => findDev('ac01').on ?? false)
const acTemp = ref(26)
const fanOn = computed(() => findDev('fan01').on ?? false)
const fanAuto = computed(() => findDev('fan01').auto ?? false)
const doorLocked = computed(() => findDev('door01').locked ?? true)
const winOpen = computed(() => findDev('window01').open ?? false)
const doorLastName = ref('张三')
const doorLastTime = ref('')
const sceneLabel = ref('回家模式')
const tempWarn = computed(() => (sensors.value.temperature || 0) > 30 ? '#e5544b' : '#e9e6df')

// Floor plan colors
const lightRing = computed(() => lightOn.value ? '#f2a950' : '#3a4757')
const lightIconBg = computed(() => lightOn.value ? '#2a2113' : '#141a23')
const lightStroke = computed(() => lightOn.value ? '#f2a950' : '#6b7686')
const acRing = computed(() => acOn.value ? '#5b8def' : '#3a4757')
const acIconBg = computed(() => acOn.value ? '#1a2633' : '#141a23')
const acStroke = computed(() => acOn.value ? '#5b8def' : '#6b7686')
const fanRing = computed(() => fanOn.value ? '#5bd0e0' : '#3a4757')
const fanIconBg = computed(() => fanOn.value ? '#1a2e33' : '#141a23')
const fanStroke = computed(() => fanOn.value ? '#5bd0e0' : '#6b7686')
const doorRing = computed(() => doorLocked.value ? '#46b98a' : '#e5544b')
const winRing = computed(() => winOpen.value ? '#f2a950' : '#3a4757')
const glowR = computed(() => lightOn.value ? 140 : 0)

// Sparklines
const tempSpark = computed(() => {
  const pts = history.value.slice(-48).map((h,i) => `${(i/(47))*120},${34-(h.temp-20)/15*30}`)
  return pts.join(' ')
})
const humSpark = computed(() => {
  const pts = history.value.slice(-48).map((h,i) => `${(i/(47))*120},${34-(h.hum-30)/60*30}`)
  return pts.join(' ')
})

// 24h chart
const chartData = computed(() => {
  return history.value.length ? history.value : []
})
const chartTemp = computed(() => {
  return chartData.value.map((h,i) => `${(i/(chartData.value.length-1||1))*592+8},${150-(h.temp-20)/15*100}`).join(' ')
})
const chartHum = computed(() => {
  return chartData.value.map((h,i) => `${(i/(chartData.value.length-1||1))*592+8},${150-(h.hum-30)/60*100}`).join(' ')
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
    if (!history.value.length || history.value.length > 300) history.value = []
    history.value.push({ ts: d.ts || new Date().toISOString(), temp: d.temperature || 25, hum: d.humidity || 55 })
    if (history.value.length > 144) history.value = history.value.slice(-144)
  } catch { setOnline(false) }
}

const fetchEvents = async () => {
  try { const r = await api.getLogs({ page: 1, size: 8 }); setOnline(true)
    events.value = (r.items||[]).slice(0,6).map(l => {
      const isDeny = l.action === 'door_deny'; const isPass = l.action === 'door_open'
      return { id: l.id, text: (isDeny ? '门禁拒绝' : isPass ? `${l.operator} 开门通过` : actionLabel(l.action)), time: dayjs(l.ts).format('HH:mm'), color: isDeny ? '#e5544b' : isPass ? '#46b98a' : '#8b95a3', bold: isDeny || isPass }
    })
    const hasDeny = (r.items||[]).some(l => l.action === 'door_deny')
    if (hasDeny) { denyFlash.value = 1; setTimeout(() => denyFlash.value = 0, 2000) }
  } catch {}
}
const actionLabel = (a) => ({ light_on:'开灯', light_off:'关灯', fan_auto_on:'风扇自启', scene_away:'离家', scene_home:'回家', scene_night:'睡眠' }[a] || a)

// Sync light/AC local state from API
watch(devices, () => {
  const d = devices.value.find(d=>d.device_id==='light01'); if(d) lightBr.value = d.state?.brightness??80
  const a = devices.value.find(d=>d.device_id==='ac01'); if(a) acTemp.value = a.state?.temp_set??26
}, { deep: true })

onMounted(() => {
  refreshDevices(); fetchSensors(); fetchEvents()
  sensorTimer = setInterval(fetchSensors, 3000)
  eventTimer = setInterval(fetchEvents, 5000)
})
onUnmounted(() => { clearInterval(sensorTimer); clearInterval(eventTimer) })
</script>

<style scoped>
.dash{max-width:1560px;margin:0 auto}
.dash-grid{display:grid;grid-template-columns:308px minmax(0,1fr) 300px;gap:16px;align-items:start}
.col-l,.col-c,.col-r{display:flex;flex-direction:column;gap:14px}
.sensor-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sensor-card{background:#181f29;border:1px solid #232c39;border-radius:14px;padding:14px 15px 10px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
.sc-top{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#98a2b0}
.sc-val{font-family:'JetBrains Mono',monospace;font-size:31px;font-weight:700;line-height:1;margin-top:4px;font-variant-numeric:tabular-nums}
.sc-unit{font-size:13px;color:#98a2b0;margin-left:2px}
.spark{width:100%;height:28px;margin-top:6px}
.card{background:#181f29;border:1px solid #232c39;border-radius:14px;padding:15px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
.card-title{font-size:12px;font-weight:700;color:#b9c1cd;margin-bottom:10px}
.dev-row{border:1px solid #222b37;border-radius:11px;padding:11px 12px;background:#141a23;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
.dev-info{display:flex;align-items:center;gap:8px}
.dev-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dev-icon-sm{width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dev-name{font-weight:500;font-size:13px}
.dev-sub{font-size:10px;color:#6b7686;font-variant-numeric:tabular-nums}
.toggle{width:42px;height:24px;border-radius:12px;background:#232c39;cursor:pointer;position:relative;transition:.2s;flex-shrink:0;border:1px solid #2a3442}
.toggle.on{background:#f2a950;border-color:#f2a950}
.toggle-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s}
.toggle.on .toggle-knob{left:20px}
.slider{width:100%;margin-top:0;margin-bottom:8px;height:4px;accent-color:#f2a950}
.ac-stepper{display:flex;align-items:center;gap:2px;background:#1c232e;border:1px solid #2a3442;border-radius:8px;padding:2px}
.ac-btn{width:22px;height:22px;border:none;background:transparent;color:#b9c1cd;font-size:14px;cursor:pointer;border-radius:6px;font-family:inherit}
.ac-val{font-family:'JetBrains Mono',monospace;font-size:12px;width:32px;text-align:center;font-variant-numeric:tabular-nums}
.auto-tag{font-size:9px;color:#f2a950;border:1px solid #6a4e26;background:#2a2113;padding:1px 5px;border-radius:5px;font-weight:400}
.dev-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dev-mini{border:1px solid #222b37;border-radius:11px;padding:10px 11px;background:#141a23}
.mini-status{font-size:11px;color:#b9c1cd;margin-bottom:3px}
.mini-sub{font-size:10px;color:#6b7686;font-variant-numeric:tabular-nums}
.fp-card{position:relative}
.fp-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.fp-header .card-title{margin-bottom:0}
.fp-scene{font-size:10px;color:#6b7686}
.fp-svg{width:100%;height:auto;display:block}
.chart-card{padding-bottom:12px}
.chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.chart-header .card-title{margin-bottom:0}
.chart-legend{display:flex;gap:12px;font-size:10px;color:#b9c1cd}
.chart-svg{width:100%;height:auto;display:block}
.chart-ticks{display:flex;justify-content:space-between;font-size:10px;color:#6b7686;margin-top:2px;font-variant-numeric:tabular-nums}
.event-card{display:flex;flex-direction:column;max-height:390px}
.event-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid #1e2732}
.event-poll{font-size:10px;color:#6b7686;display:flex;align-items:center;gap:4px}
.poll-dot{width:5px;height:5px;border-radius:50%;background:#46b98a;box-shadow:0 0 5px #46b98a}
.event-list{flex:1;overflow-y:auto;padding:6px 0}
.event-item{padding:8px 10px;border-left:3px solid #2a3442;margin:2px 0;font-size:12px;display:flex;justify-content:space-between;align-items:center;background:#141a23;border-radius:0 8px 8px 0}
.event-time{font-size:10px;color:#6b7686;font-variant-numeric:tabular-nums;flex-shrink:0}
.event-empty{text-align:center;padding:30px 0;color:#6b7686;font-size:12px}
.yolo-card{cursor:pointer}
.yolo-placeholder{position:relative;border-radius:11px;overflow:hidden;aspect-ratio:16/10;background:linear-gradient(135deg,#1e2732,#151b23);border:1px solid #2a3442;display:flex;align-items:center;justify-content:center}
.yolo-box{position:absolute}
</style>
