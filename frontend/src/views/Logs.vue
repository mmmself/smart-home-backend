<template>
  <div class="logs-page">
    <div class="filter-bar">
      <select v-model="filterAction" class="fb-sel"><option value="">全部动作</option><option v-for="a in actionOptions" :key="a.value" :value="a.value">{{ a.label }}</option></select>
      <input type="date" v-model="filterStart" class="fb-date" />
      <input type="date" v-model="filterEnd" class="fb-date" />
      <button class="btn-query" @click="fetchList">查询</button>
    </div>
    <div class="card">
      <div class="l-header"><span>时间</span><span>动作</span><span>目标</span><span>操作者</span><span>详情</span></div>
      <div v-for="l in list" :key="l.id" class="l-row">
        <span class="l-time">{{ formatTime(l.ts) }}</span>
        <span><span :class="['action-tag',l.action]">{{ actionLabel(l.action) }}</span></span>
        <span>{{ l.target || '--' }}</span>
        <span>{{ l.operator || '--' }}</span>
        <span class="l-detail" @click="showDetail=l===showDetail?null:l">{{ detailText(l) }}</span>
      </div>
      <div v-if="showDetail" class="detail-panel">
        <pre>{{ JSON.stringify(showDetail, null, 2) }}</pre>
        <button @click="showDetail=null" class="btn-close">关闭</button>
      </div>
      <div v-if="!list.length" style="text-align:center;padding:30px;color:#6b7686">暂无日志</div>
      <div v-if="total > pageSize" style="display:flex;justify-content:center;gap:6px;margin-top:12px">
        <button v-for="i in Math.ceil(total/pageSize)" :key="i" :class="['page-btn',{active:page===i}]" @click="page=i;fetchList()">{{ i }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline'])
const { setOnline } = props

const filterAction = ref(''); const filterStart = ref(''); const filterEnd = ref('')
const page = ref(1); const pageSize = 15; const total = ref(0); const list = ref([])
const showDetail = ref(null)

const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : ''
const actionLabel = (a) => ({ door_open:'开门通过', door_deny:'门禁拒绝', light_on:'开灯', light_off:'关灯', ac_on:'开空调', ac_off:'关空调', fan_auto_on:'风扇自启', scene_away:'离家', scene_home:'回家', scene_night:'睡眠', linkage_light_on:'联动开灯' }[a] || a)
const actionOptions = Object.entries({ door_open:'开门通过', door_deny:'门禁拒绝', light_on:'开灯', light_off:'关灯', fan_auto_on:'风扇自启' }).map(([v,l])=>({value:v,label:l}))
const detailText = (l) => l.detail && Object.keys(l.detail).length ? '查看详情 ▸' : '-'

const fetchList = async () => {
  const params = { page: page.value, size: pageSize }
  if (filterAction.value) params.action = filterAction.value
  if (filterStart.value) params.start = filterStart.value + 'T00:00:00'
  if (filterEnd.value) params.end = filterEnd.value + 'T23:59:59'
  try { const r = await api.getLogs(params); list.value = r.items; total.value = r.total; setOnline(true) } catch { setOnline(false) }
}
onMounted(fetchList)
</script>

<style scoped>
.logs-page{max-width:1100px;margin:0 auto}
.filter-bar{display:flex;gap:10px;margin-bottom:14px;align-items:center}
.fb-sel{padding:7px 10px;border-radius:7px;border:1px solid #2a3442;background:#141a23;color:#e9e6df;font-size:12px;font-family:inherit;outline:none}
.fb-date{padding:7px 10px;border-radius:7px;border:1px solid #2a3442;background:#141a23;color:#e9e6df;font-size:12px;font-family:inherit;outline:none;color-scheme:dark}
.btn-query{padding:7px 18px;border-radius:7px;border:none;background:#f2a950;color:#1a1206;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit}
.card{background:#181f29;border:1px solid #232c39;border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
.l-header,.l-row{display:grid;grid-template-columns:170px 100px 80px 120px 1fr;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid #1c2531;font-size:12px}
.l-header{font-size:10px;color:#6b7686;padding-bottom:6px}
.l-time{font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b95a3;font-variant-numeric:tabular-nums}
.action-tag{padding:2px 7px;border-radius:4px;font-size:10px}
.action-tag.door_deny{background:rgba(229,84,75,.15);color:#e5544b}
.action-tag.door_open{background:rgba(70,185,138,.15);color:#46b98a}
.action-tag.fan_auto_on{background:rgba(91,208,224,.15);color:#5bd0e0}
.action-tag.scene_away,.action-tag.scene_home,.action-tag.scene_night{background:rgba(91,141,239,.15);color:#5b8def}
.action-tag.light_on,.action-tag.light_off,.action-tag.ac_on,.action-tag.ac_off,.action-tag.linkage_light_on{background:rgba(242,169,80,.1);color:#f2a950}
.l-detail{color:#5b8def;cursor:pointer;font-size:11px}
.detail-panel{background:#141a23;border:1px solid #2a3442;border-radius:10px;padding:14px;margin-top:10px;position:relative}
.detail-panel pre{font-size:11px;color:#8b95a3;white-space:pre-wrap;margin:0}
.btn-close{position:absolute;top:8px;right:10px;padding:2px 8px;border-radius:4px;border:1px solid #2a3442;background:#1c232e;color:#8b95a3;cursor:pointer;font-size:10px}
.page-btn{padding:4px 10px;border-radius:5px;border:1px solid #2a3442;background:#1c232e;color:#8b95a3;cursor:pointer;font-size:11px}
.page-btn.active{background:rgba(242,169,80,.1);border-color:#f2a950;color:#f2a950}
</style>
