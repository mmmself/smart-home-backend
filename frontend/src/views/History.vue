<template>
  <div class="page">
    <h1>历史数据</h1>
    <div class="filters">
      <el-select v-model="metric" style="width:140px">
        <el-option label="温度" value="temperature" />
        <el-option label="湿度" value="humidity" />
      </el-select>
      <el-select v-model="interval" style="width:120px">
        <el-option label="5分钟" value="5m" />
        <el-option label="1小时" value="1h" />
        <el-option label="6小时" value="6h" />
      </el-select>
      <el-button type="primary" @click="fetchHistory">查询</el-button>
    </div>

    <div v-if="chartData.length" class="chart-container">
      <v-chart :option="chartOption" autoresize style="height:380px" />
      <div class="chart-summary">
        <span>均值: {{ avgVal }} | 最高: {{ maxVal }} | 最低: {{ minVal }}</span>
      </div>
    </div>
    <div v-else class="empty-text">暂无数据，请选择指标后点击查询</div>

    <div class="section-title" style="margin-top:24px">操作日志</div>
    <el-table :data="logs" size="small" v-loading="logsLoading">
      <el-table-column prop="action" label="动作" width="120">
        <template #default="{ row }">
          <el-tag :type="actionType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="target" label="目标" width="100" />
      <el-table-column prop="operator" label="操作者" width="120" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ formatTime(row.ts) }}</template>
      </el-table-column>
      <el-table-column prop="detail" label="详情">
        <template #default="{ row }">{{ JSON.stringify(row.detail) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer])

const metric = ref('temperature')
const interval = ref('1h')
const chartData = ref([])
const logs = ref([])
const logsLoading = ref(false)

const formatTime = (t) => t ? dayjs(t).format('MM-DD HH:mm') : ''
const actionLabel = (a) => ({ door_open: '开门', door_deny: '拒门', light_on: '开灯', light_off: '关灯', fan_auto_on: '风扇自启', scene_away: '离家', scene_home: '回家', scene_night: '睡眠' }[a] || a)
const actionType = (a) => a === 'door_deny' ? 'danger' : a === 'door_open' ? 'success' : a?.includes('scene') ? '' : 'info'

const avgVal = computed(() => chartData.value.length ? (chartData.value.reduce((s,i)=>s+i.avg,0)/chartData.value.length).toFixed(1) : '--')
const maxVal = computed(() => chartData.value.length ? Math.max(...chartData.value.map(i=>i.max)).toFixed(1) : '--')
const minVal = computed(() => chartData.value.length ? Math.min(...chartData.value.map(i=>i.min)).toFixed(1) : '--')

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['平均值', '最大值', '最小值'], textStyle: { color: '#8b95a3' } },
  grid: { left: 40, right: 20, top: 30, bottom: 60 },
  xAxis: { type: 'category', data: chartData.value.map(d => formatTime(d.ts)), axisLabel: { color: '#6b7686', fontSize: 11 } },
  yAxis: { type: 'value', axisLabel: { color: '#6b7686' } },
  dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10 }],
  series: [
    { name: '平均值', type: 'line', data: chartData.value.map(d => d.avg), smooth: true, lineStyle: { color: '#f2a950' }, itemStyle: { color: '#f2a950' } },
    { name: '最大值', type: 'line', data: chartData.value.map(d => d.max), smooth: true, lineStyle: { color: '#60a5fa', type: 'dashed' }, itemStyle: { color: '#60a5fa' } },
    { name: '最小值', type: 'line', data: chartData.value.map(d => d.min), smooth: true, lineStyle: { color: '#34d399', type: 'dashed' }, itemStyle: { color: '#34d399' } },
  ],
}))

const fetchHistory = async () => {
  try { chartData.value = await api.sensorsHistory({ metric: metric.value, interval: interval.value }) } catch {}
}

const fetchLogs = async () => {
  logsLoading.value = true
  try { const r = await api.getLogs({ page: 1, size: 20 }); logs.value = r.items || [] } catch {}
  logsLoading.value = false
}

onMounted(() => { fetchLogs() })
</script>

<style scoped>
.page { padding:24px 28px; }
.page h1 { margin:0 0 20px; font-size:18px; }
.filters { display:flex; gap:10px; margin-bottom:16px; align-items:center; }
.chart-container { background:#151b24; border:1px solid #1e2530; border-radius:10px; padding:16px; margin-bottom:16px; }
.chart-summary { text-align:center; font-size:12px; color:#8b95a3; margin-top:8px; }
.section-title { font-size:13px; font-weight:600; color:#8b95a3; margin-bottom:8px; }
.empty-text { text-align:center; padding:50px; color:#6b7686; font-size:13px; }
</style>
