<template>
  <div class="page">
    <h1>操作日志</h1>
    <div class="filters">
      <el-select v-model="filterAction" clearable placeholder="动作筛选" style="width:150px">
        <el-option v-for="a in actionOptions" :key="a.value" :label="a.label" :value="a.value" />
      </el-select>
      <el-date-picker v-model="filterDate" type="datetimerange" range-separator="至" start-placeholder="开始" end-placeholder="结束" style="width:360px" value-format="YYYY-MM-DDTHH:mm:ss" />
      <el-button type="primary" @click="fetchList">查询</el-button>
    </div>

    <el-table :data="list" v-loading="loading" size="small">
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.ts) }}</template>
      </el-table-column>
      <el-table-column label="动作" width="120">
        <template #default="{ row }">
          <el-tag :type="actionType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="target" label="目标设备" width="100" />
      <el-table-column prop="operator" label="操作者" width="140" />
      <el-table-column label="详情">
        <template #default="{ row }">
          <el-popover v-if="row.detail && Object.keys(row.detail).length" trigger="click" :width="250">
            <template #reference>
              <el-button size="small" link type="primary">查看详情</el-button>
            </template>
            <pre style="font-size:11px;white-space:pre-wrap">{{ JSON.stringify(row.detail, null, 2) }}</pre>
          </el-popover>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-if="total > pageSize" v-model:current-page="page" :page-size="pageSize" :total="total" @current-change="fetchList" layout="prev,pager,next" style="margin-top:16px;justify-content:center" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import dayjs from 'dayjs'

const filterAction = ref('')
const filterDate = ref([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const list = ref([])
const loading = ref(false)

const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : ''
const actionLabel = (a) => ({ door_open: '开门通过', door_deny: '门禁拒绝', light_on: '开灯', light_off: '关灯', ac_on: '开空调', ac_off: '关空调', fan_auto_on: '风扇自启', scene_away: '离家模式', scene_home: '回家模式', scene_night: '睡眠模式', linkage_light_on: '联动开灯' }[a] || a)
const actionType = (a) => a === 'door_deny' ? 'danger' : a === 'door_open' ? 'success' : a?.includes('scene') ? '' : 'info'
const actionOptions = [
  { value: 'door_open', label: '开门通过' },
  { value: 'door_deny', label: '门禁拒绝' },
  { value: 'light_on', label: '开灯' },
  { value: 'light_off', label: '关灯' },
  { value: 'fan_auto_on', label: '风扇自启' },
  { value: 'scene_away', label: '离家模式' },
  { value: 'scene_home', label: '回家模式' },
  { value: 'scene_night', label: '睡眠模式' },
]

const fetchList = async () => {
  loading.value = true
  const params = { page: page.value, size: pageSize }
  if (filterAction.value) params.action = filterAction.value
  if (filterDate.value?.length === 2) { params.start = filterDate.value[0]; params.end = filterDate.value[1] }
  try { const r = await api.getLogs(params); list.value = r.items; total.value = r.total } catch {}
  loading.value = false
}

onMounted(fetchList)
</script>

<style scoped>
.page { padding:24px 28px; }
.page h1 { margin:0 0 20px; font-size:18px; }
.filters { display:flex; gap:10px; margin-bottom:16px; align-items:center; }
</style>
