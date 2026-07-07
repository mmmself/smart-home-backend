<template>
  <div class="persons-page">
    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索姓名…" class="search-inp" @keyup.enter="fetchList" />
      <button class="btn-primary" @click="openDrawer()">新增人员</button>
    </div>
    <div class="card">
      <div class="p-header">
        <span>ID</span><span>姓名</span><span>电话</span><span>角色</span><span>人脸数</span><span>状态</span><span>创建时间</span><span>操作</span>
      </div>
      <div v-for="p in list" :key="p.id" class="p-row">
        <span class="p-id">{{ p.id }}</span>
        <span class="p-name">{{ p.name }}</span>
        <span class="p-phone">{{ p.phone || '--' }}</span>
        <span><span :class="['role-tag', p.role]">{{ roleLabel(p.role) }}</span></span>
        <span>{{ p.face_count || 0 }}</span>
        <span :style="{color: p.is_active ? '#2dbd7a' : '#e5544b'}">{{ p.is_active ? '启用' : '禁用' }}</span>
        <span class="p-time">{{ formatTime(p.created_at) }}</span>
        <span class="p-acts">
          <button @click="openDrawer(p)" class="btn-sm">编辑</button>
          <button @click="doDel(p.id)" class="btn-sm btn-del">删除</button>
        </span>
      </div>
      <EmptyState v-if="!list.length" icon="person" text="暂无人员" />
      <div v-if="total > pageSize" class="pagination">
        <span v-for="(p, i) in pageItems" :key="i" :class="['page-btn', {active: page === p, ellipsis: p === '…'}]" @click="typeof p === 'number' ? (page = p, fetchList()) : ''">{{ p }}</span>
      </div>
    </div>

    <div class="drawer-overlay" v-if="drawer" @click.self="drawer = false">
      <div class="drawer">
        <h3>{{ editingId ? '编辑人员' : '新增人员' }}</h3>
        <div class="form-group">
          <label>姓名</label>
          <input v-model="form.name" class="form-inp" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label>电话</label>
          <input v-model="form.phone" class="form-inp" placeholder="请输入电话（选填）" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <div class="role-options">
            <button v-for="r in ['owner', 'family', 'guest']" :key="r" :class="['role-opt', {active: form.role === r}]" @click="form.role = r">{{ roleLabel(r) }}</button>
          </div>
        </div>
        <div class="form-group">
          <label>启用</label>
          <span :class="['toggle-sm', {on: form.is_active}]" @click="form.is_active = !form.is_active"><span class="tk"></span></span>
        </div>
        <button class="btn-primary" @click="doSave" style="width: 100%; margin-top: 12px">{{ editingId ? '保存修改' : '创建人员' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import EmptyState from '../components/EmptyState.vue'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline', 'showToast', 'confirm'])
const { showToast, setOnline } = props

const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const list = ref([])
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
const drawer = ref(false)
const editingId = ref(null)
const form = ref({ name: '', phone: '', role: 'family', is_active: true })

const roleLabel = (r) => ({ owner: '户主', family: '家人', guest: '访客' }[r] || r)
const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''

const fetchList = async () => {
  try {
    const r = await api.getPersons({ keyword: keyword.value, page: page.value, size: pageSize })
    list.value = r.items
    total.value = r.total
    setOnline(true)
  } catch {
    setOnline(false)
  }
}
const openDrawer = (row) => {
  if (row) {
    editingId.value = row.id
    form.value = { name: row.name, phone: row.phone || '', role: row.role, is_active: row.is_active }
  } else {
    editingId.value = null
    form.value = { name: '', phone: '', role: 'family', is_active: true }
  }
  drawer.value = true
}
const doSave = async () => {
  if (!form.value.name) { showToast('error', '请输入姓名'); return }
  try {
    editingId.value ? await api.updatePerson(editingId.value, form.value) : await api.createPerson(form.value)
    drawer.value = false
    fetchList()
    showToast('success', editingId.value ? '已更新' : '已创建')
  } catch {
    showToast('error', '保存失败')
  }
}
const doDel = async (id) => {
  props.confirm({
    title: '删除人员',
    text: '将同时删除该人员的全部人脸特征，确定删除？',
    okText: '删除',
    okBg: '#e5544b',
    onOk: async () => {
      await api.deletePerson(id)
      fetchList()
      showToast('success', '已删除')
    }
  })
}
onMounted(fetchList)
</script>

<style scoped>
.persons-page { max-width: 1100px; margin: 0 auto }
.toolbar { display: flex; gap: 10px; margin-bottom: 14px }
.search-inp { padding: 7px 12px; border-radius: 7px; border: 1px solid #e4e8ed; background: #ffffff; color: var(--text-primary); font-size: 12px; width: 200px; font-family: inherit; outline: none }
.search-inp:focus { border-color: #e07b30 }
.btn-primary { padding: 7px 16px; border-radius: 7px; border: none; background: #e07b30; color: #ffffff; cursor: pointer; font-size: 12px; font-weight: 500; font-family: inherit; transition: background .15s }
.btn-primary:hover { background: #c96a25 }
.card { background: #ffffff; border: 1px solid #e4e8ed; border-radius: 14px; padding: 14px 16px; box-shadow: var(--shadow-sm) }
.p-header, .p-row { display: grid; grid-template-columns: 40px 1fr 1fr 60px 50px 50px 140px 100px; gap: 10px; align-items: center; padding: 9px 6px; border-bottom: 1px solid #f0f2f5; font-size: 12px }
.p-header { font-size: 10px; color: var(--text-muted); padding-bottom: 6px }
.p-id { font-family: 'JetBrains Mono', monospace; color: var(--text-muted); font-size: 11px }
.p-name { font-weight: 500; color: var(--text-primary) }
.p-phone { color: var(--text-muted) }
.p-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted) }
.p-acts { display: flex; gap: 4px }
.btn-sm { padding: 3px 8px; border-radius: 5px; border: 1px solid #e4e8ed; background: #ffffff; color: var(--text-secondary); cursor: pointer; font-size: 10px; font-family: inherit; transition: all .15s }
.btn-sm:hover { color: var(--text-primary); border-color: #c0c8d4 }
.btn-del { color: #e5544b; border-color: #fde8e7 }
.btn-del:hover { background: #fde8e7; border-color: #e5544b }
.role-tag { padding: 2px 7px; border-radius: 5px; font-size: 10px }
.role-tag.owner { background: #fef6ed; color: #b07a2a }
.role-tag.family { background: #e8f5ee; color: #1a9a5c }
.role-tag.guest { background: #f5f7fa; color: var(--text-secondary) }
.pagination { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 12px }
.page-btn { padding: 4px 10px; border-radius: 5px; border: 1px solid #e4e8ed; background: #ffffff; color: var(--text-secondary); cursor: pointer; font-size: 11px; transition: .15s }
.page-btn:hover:not(.active):not(.ellipsis) { border-color: #c0c8d4; color: var(--text-primary) }
.page-btn.active { background: var(--accent-light); border-color: #e07b30; color: #e07b30 }
.page-btn.ellipsis { cursor: default; border-color: transparent; background: transparent }
.drawer-overlay { position: fixed; inset: 0; z-index: 80; background: rgba(0, 0, 0, 0.4); display: flex; justify-content: flex-end }
.drawer { width: 360px; height: 100%; background: #ffffff; border-left: 1px solid #e4e8ed; padding: 24px; overflow-y: auto; animation: slideIn .2s ease }
.drawer h3 { margin: 0 0 18px; font-size: 16px; color: var(--text-primary) }
.form-group { margin-bottom: 12px }
.form-group label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px }
.form-inp { width: 100%; padding: 8px 10px; border-radius: 7px; border: 1px solid #e4e8ed; background: #fafbfc; color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s }
.form-inp:focus { border-color: #e07b30 }
.role-options { display: flex; gap: 6px }
.role-opt { padding: 5px 12px; border-radius: 6px; border: 1px solid #e4e8ed; background: #ffffff; color: var(--text-secondary); cursor: pointer; font-size: 12px; font-family: inherit; transition: .15s }
.role-opt:hover:not(.active) { border-color: #c0c8d4; color: var(--text-primary) }
.role-opt.active { border-color: #e07b30; color: #e07b30; background: var(--accent-light) }
.toggle-sm { width: 38px; height: 22px; border-radius: 11px; background: #e4e8ed; display: inline-block; position: relative; cursor: pointer; border: 1px solid #d0d5dd; transition: .2s }
.toggle-sm.on { background: #e07b30; border-color: #e07b30 }
.tk { position: absolute; top: 1px; left: 1px; width: 18px; height: 18px; border-radius: 50%; background: #ffffff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15) }
.toggle-sm.on .tk { left: 17px }
</style>
