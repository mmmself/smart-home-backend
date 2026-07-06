<template>
  <div class="hist-page">
    <div class="card filter-bar">
      <div class="fb-group"><span class="fb-label">指标</span>
        <button v-for="m in metrics" :key="m.key" :class="['fb-btn',{active:metric===m.key}]" @click="metric=m.key">{{ m.label }}</button>
      </div>
      <div class="fb-group"><span class="fb-label">时间</span>
        <button v-for="r in ranges" :key="r.key" :class="['fb-btn',{active:range===r.key}]" @click="range=r.key">{{ r.label }}</button>
      </div>
      <div class="fb-group"><span class="fb-label">粒度</span>
        <button v-for="i in intervals" :key="i.key" :class="['fb-btn',{active:interval===i.key}]" @click="interval=i.key">{{ i.label }}</button>
      </div>
      <button class="btn-query" @click="fetchHistory">查询</button>
    </div>

    <div class="card chart-box" v-if="chartData.length">
      <div class="chart-summary">
        <div class="chart-title">{{ metrics.find(m=>m.key===metric)?.label }}趋势</div>
        <div class="sum-stats">
          <div class="sum-item"><div class="sum-label">均值</div><div class="sum-val" :style="{color:chartColor}">{{ meanVal }}</div></div>
          <div class="sum-item"><div class="sum-label">最高</div><div class="sum-val" style="color:#e5544b">{{ maxVal }}</div></div>
          <div class="sum-item"><div class="sum-label">最低</div><div class="sum-val" style="color:#5b8def">{{ minVal }}</div></div>
        </div>
      </div>
      <svg viewBox="0 0 760 210" class="history-svg">
        <line x1="10" y1="182" x2="750" y2="182" stroke="#232c39" stroke-width="1"/>
        <line x1="10" y1="120" x2="750" y2="120" stroke="#1c2531" stroke-width="1" stroke-dasharray="3 4"/>
        <line x1="10" y1="58" x2="750" y2="58" stroke="#1c2531" stroke-width="1" stroke-dasharray="3 4"/>
        <polygon :points="bandPoints" :fill="chartColor" opacity="0.12"/>
        <polyline :points="avgPoints" fill="none" :stroke="chartColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <text v-for="t in svgTicks" :key="t.x" :x="t.x" y="200" fill="#6b7686" font-size="10" text-anchor="middle" font-family="JetBrains Mono">{{ t.label }}</text>
      </svg>
    </div>

    <div class="card changes-card">
      <div class="card-title">状态变化</div>
      <div class="ch-row ch-header"><span>时间</span><span>设备</span><span>变化</span><span>触发者</span></div>
      <div v-for="c in changes" :key="c.id" class="ch-row">
        <span class="ch-time">{{ c.date }} {{ c.time }}</span>
        <span><span :style="{width:'7px',height:'7px',borderRadius:'2px',background:c.tone||'#46b98a',display:'inline-block',marginRight:'6px'}"></span>{{ c.device }}</span>
        <span class="ch-val">{{ c.change }}</span>
        <span class="ch-trigger">{{ c.trigger }}</span>
      </div>
      <div v-if="!changes.length" style="text-align:center;color:#6b7686;padding:20px">暂无状态变化记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline'])
const { setOnline } = props

const metric = ref('temperature')
const range = ref('24h')
const interval = ref('1h')
const chartData = ref([])
const changes = ref([])

const metrics = [{key:'temperature',label:'温度'},{key:'humidity',label:'湿度'},{key:'brightness',label:'亮度'}]
const ranges = [{key:'24h',label:'近 24h'},{key:'7d',label:'近 7 天'},{key:'today',label:'今天'}]
const intervals = [{key:'5m',label:'5 分钟'},{key:'1h',label:'1 小时'}]
const chartColor = ref('#f2a950')

const meanVal = computed(() => chartData.value.length ? (chartData.value.reduce((s,i)=>s+i.avg,0)/chartData.value.length).toFixed(1) : '--')
const maxVal = computed(() => chartData.value.length ? Math.max(...chartData.value.map(i=>i.max)).toFixed(1) : '--')
const minVal = computed(() => chartData.value.length ? Math.min(...chartData.value.map(i=>i.min)).toFixed(1) : '--')

const avgPoints = computed(() => {
  if (!chartData.value.length) return ''
  const min = Math.min(...chartData.value.map(d=>d.min))
  const max = Math.max(...chartData.value.map(d=>d.max))
  const range = max - min || 1
  return chartData.value.map((d,i) => `${10+(i/(chartData.value.length-1||1))*740},${182-((d.avg-min)/range)*124}`).join(' ')
})
const bandPoints = computed(() => {
  if (!chartData.value.length) return ''
  const min = Math.min(...chartData.value.map(d=>d.min))
  const max = Math.max(...chartData.value.map(d=>d.max))
  const range = max - min || 1
  const top = chartData.value.map((d,i) => `${10+(i/(chartData.value.length-1||1))*740},${182-((d.max-min)/range)*124}`).join(' ')
  const bottom = [...chartData.value].reverse().map((d,i) => `${10+((chartData.value.length-1-i)/(chartData.value.length-1||1))*740},${182-((d.min-min)/range)*124}`).join(' ')
  return top + ' ' + bottom
})
const svgTicks = computed(() => {
  if (chartData.value.length < 4) return []
  const n = chartData.value.length
  return [{x:10,label:dayjs(chartData.value[0]?.ts).format('HH:mm')},{x:380,label:dayjs(chartData.value[Math.floor(n/2)]?.ts).format('HH:mm')},{x:750,label:dayjs(chartData.value[n-1]?.ts).format('HH:mm')}]
})

const fetchHistory = async () => {
  try { const d = await api.sensorsHistory({ metric: metric.value, interval: interval.value }); chartData.value = d || []; setOnline(true)
    chartColor.value = metric.value === 'temperature' ? '#f2a950' : metric.value === 'humidity' ? '#5b8def' : '#8fce6a'
  } catch { setOnline(false) }
}

const fetchChanges = async () => {
  try { const r = await api.getLogs({ page: 1, size: 15 }); setOnline(true)
    changes.value = (r.items||[]).filter(l => ['door_open','door_deny','light_on','light_off','fan_auto_on','scene_away','scene_home','scene_night'].includes(l.action)).map(l => {
      const tone = l.action==='door_deny'?'#e5544b':l.action==='door_open'?'#46b98a':l.action==='fan_auto_on'?'#5bd0e0':l.action.includes('scene')?'#5b8def':'#f2a950'
      const ts = l.ts ? dayjs(l.ts) : dayjs()
      return { id:l.id, date:ts.format('MM-DD'), time:ts.format('HH:mm'), device:l.target||'--', change:actionLabel(l.action), trigger:l.operator||'system', tone }
    })
  } catch {}
}
const actionLabel = (a) => ({ door_open:'开门通过', door_deny:'门禁拒绝', light_on:'开灯', light_off:'关灯', fan_auto_on:'风扇自启(高温)', scene_away:'离家模式', scene_home:'回家模式', scene_night:'睡眠模式' }[a] || a)

onMounted(() => { fetchChanges() })
</script>

<style scoped>
.hist-page{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.card{background:#181f29;border:1px solid #232c39;border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
.card-title{font-size:12px;font-weight:700;color:#b9c1cd;margin-bottom:10px}
.filter-bar{display:flex;flex-wrap:wrap;align-items:center;gap:14px}
.fb-group{display:flex;align-items:center;gap:6px}
.fb-label{font-size:11px;color:#6b7686}
.fb-btn{padding:5px 11px;border-radius:6px;border:1px solid #2a3442;background:#1c232e;color:#8b95a3;cursor:pointer;font-size:11px;font-family:inherit}
.fb-btn:hover{color:#e9e6df}
.fb-btn.active{background:rgba(242,169,80,.1);border-color:#f2a950;color:#f2a950}
.btn-query{margin-left:auto;padding:7px 18px;border-radius:7px;border:none;background:#f2a950;color:#1a1206;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit}
.chart-summary{display:flex;align-items:center;gap:20px;margin-bottom:14px}
.chart-title{font-size:12px;font-weight:700;color:#b9c1cd}
.sum-stats{display:flex;gap:22px}
.sum-item{text-align:center}
.sum-label{font-size:10px;color:#6b7686}
.sum-val{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}
.history-svg{width:100%;height:auto;display:block}
.changes-card{margin-top:0}
.ch-row{display:grid;grid-template-columns:130px 120px 1fr 1fr;gap:12px;align-items:center;padding:10px 4px;border-bottom:1px solid #1c2531;font-size:12px}
.ch-header{font-size:10px;color:#6b7686;padding-bottom:6px}
.ch-time{font-family:'JetBrains Mono',monospace;color:#8b95a3;font-variant-numeric:tabular-nums}
.ch-val{color:#c4ccd6}
.ch-trigger{color:#98a2b0}
</style>
