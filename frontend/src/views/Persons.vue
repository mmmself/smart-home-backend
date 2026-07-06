<template>
  <div class="page">
    <h1>人员管理</h1>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索姓名..." style="width:220px" clearable @change="fetchList" />
      <el-button type="primary" @click="openDrawer()">新增人员</el-button>
    </div>

    <el-table :data="list" v-loading="loading" size="small">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="电话" />
      <el-table-column prop="role" label="角色">
        <template #default="{ row }">
          <el-tag :type="row.role==='owner'?'warning':row.role==='family'?'success':'info'" size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="face_count" label="人脸数" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_active?'success':'danger'" size="small">{{ row.is_active ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" @click="openDrawer(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="doDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-if="total > pageSize" v-model:current-page="page" :page-size="pageSize" :total="total" @current-change="fetchList" layout="prev,pager,next" style="margin-top:16px;justify-content:center" />

    <el-drawer v-model="drawer" :title="editingId ? '编辑人员' : '新增人员'" size="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="form.role">
            <el-radio value="owner">户主</el-radio>
            <el-radio value="family">家人</el-radio>
            <el-radio value="guest">访客</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-switch v-model="form.is_active" active-text="启用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doSave" :loading="saving">{{ editingId ? '保存修改' : '创建人员' }}</el-button>
        </el-form-item>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const list = ref([])
const loading = ref(false)
const drawer = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = ref({ name: '', phone: '', role: 'family', is_active: true })

const roleLabel = (r) => ({ owner: '户主', family: '家人', guest: '访客' }[r] || r)
const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''

const fetchList = async () => {
  loading.value = true
  try { const r = await api.getPersons({ keyword: keyword.value, page: page.value, size: pageSize }); list.value = r.items; total.value = r.total } catch {}
  loading.value = false
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
  if (!form.value.name) { ElMessage.warning('请输入姓名'); return }
  saving.value = true
  try {
    if (editingId.value) {
      await api.updatePerson(editingId.value, form.value)
      ElMessage.success('已更新')
    } else {
      await api.createPerson(form.value)
      ElMessage.success('已创建')
    }
    drawer.value = false
    fetchList()
  } catch {}
  saving.value = false
}

const doDelete = async (id) => {
  await ElMessageBox.confirm('删除后将同时删除该人员的全部人脸特征，确定?', '确认删除', { type: 'warning' })
  await api.deletePerson(id)
  ElMessage.success('已删除')
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.page { padding:24px 28px; }
.page h1 { margin:0 0 20px; font-size:18px; }
.toolbar { display:flex; gap:12px; margin-bottom:16px; align-items:center; }
</style>
