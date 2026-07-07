<template>
  <div class="logs-page">
    <div class="filter-bar">
      <select v-model="filterAction" class="fb-sel">
        <option value="">全部动作</option>
        <option v-for="a in actionOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
      </select>
      <input type="date" v-model="filterStart" class="fb-date" />
      <input type="date" v-model="filterEnd" class="fb-date" />
      <button class="btn-query" @click="fetchList">查询</button>
    </div>
    <div class="card">
      <div class="l-header">
        <span>时间</span><span>动作</span><span>目标</span><span>操作者</span><span>详情</span>
      </div>
      <div v-for="l in list" :key="l.id" class="l-row">
        <span class="l-time">{{ formatTime(l.ts) }}</span>
        <span><span :class="['action-tag', l.action]">{{ actionLabel(l.action) }}</span></span>
        <span>{{ l.target || '--' }}</span>
        <span>
          <span v-if="isDoorEvent(l)" class="method-tag" :class="isKeypad(l)?'keypad':'face'">{{ isKeypad(l)?'键盘':'人脸' }}</span>
          {{ l.operator === 'keypad' ? '' : (l.operator || '--') }}
        </span>
        <span class="l-detail" @click="showDetail=l===showDetail?null:l">{{ detailText(l) }}</span>
      </div>
      <div v-if="showDetail" class="detail-panel">
        <pre>{{ JSON.stringify(showDetail, null, 2) }}</pre>
        <button @click="showDetail = null" class="btn-close">关闭</button>
      </div>
      <EmptyState v-if="!list.length" icon="list" text="暂无日志" />
      <div v-if="total > pageSize" class="pagination">
        <span v-for="(p, i) in pageItems" :key="i" :class="['page-btn', {active: page === p, ellipsis: p === '…'}]" @click="typeof p === 'number' ? (page = p, fetchList()) : ''">{{ p }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import EmptyState from '../components/EmptyState.vue'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline'])
const { setOnline } = props

const filterAction = ref('')
const filterStart = ref('')
const filterEnd = ref('')
const page = ref(1)
const pageSize = 15
const total = ref(0)
const list = ref([])
const showDetail = ref(null)

const pageItems = computed(() => {
  const n = Math.ceil(total.value / pageSize)
  const p = page.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const items = [1]
  const start = Math.max(2, p - 1)
  const end = Math.min(n - 1, p + 1)
  if (start > 2) items.push('…')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < n - 1) items.push('…')
  items.push(n)
  return items
})

const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : ''
const actionLabel = (a) => ({ door_open: '开门通过', door_deny: '门禁拒绝', light_on: '开灯', light_off: '关灯', ac_on: '开空调', ac_off: '关空调', fan_auto_on: '风扇自启', fan_auto_off: '风扇自停(降温)', scene_away: '离家', scene_home: '回家', scene_night: '睡眠', linkage_light_on: '联动开灯' }[a] || a)
const actionOptions = Object.entries({ door_open: '开门通过', door_deny: '门禁拒绝', light_on: '开灯', light_off: '关灯', fan_auto_on: '风扇自启', fan_auto_off: '风扇自停(降温)' }).map(([v, l]) => ({value: v, label: l}))
const detailText = (l) => l.detail && Object.keys(l.detail).length ? '查看详情 ▸' : '-'
const isDoorEvent = (l) => l.action === 'door_open' || l.action === 'door_deny'
const isKeypad = (l) => l.operator === 'keypad' || l.detail?.method === 'keypad'

const fetchList = async () => {
  const params = { page: page.value, size: pageSize }
  if (filterAction.value) params.action = filterAction.value
  if (filterStart.value) params.start = filterStart.value + 'T00:00:00'
  if (filterEnd.value) params.end = filterEnd.value + 'T23:59:59'
  try {
    const r = await api.getLogs(params)
    list.value = r.items
    total.value = r.total
    setOnline(true)
  } catch {
    setOnline(false)
  }
}
onMounted(fetchList)
</script>

<style scoped>
</style>
