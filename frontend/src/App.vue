<template>
  <div class="app-layout">
    <aside class="sidenav">
      <div class="logo">
        <div class="logo-icon">
          <el-icon :size="18"><HomeFilled /></el-icon>
        </div>
        <div>
          <div class="logo-title">智享家</div>
          <div class="logo-sub">SMART HOME OS</div>
        </div>
      </div>
      <nav>
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="nav-item" active-class="nav-active">
          <el-icon :size="17"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidenav-footer">
        <span class="dot" :style="{ background: connected ? '#34d399' : '#f87171', boxShadow: `0 0 8px ${connected ? '#34d399' : '#f87171'}` }"></span>
        <span>{{ connected ? '后端已连接' : '后端未连接' }}</span>
      </div>
    </aside>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { HomeFilled, View, Camera, DataAnalysis, User, Document } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import { api } from './api'

const connected = ref(false)
const navItems = [
  { path: '/dashboard', label: '监控大屏', icon: 'HomeFilled' },
  { path: '/face', label: '人脸门禁', icon: 'View' },
  { path: '/detect', label: '物体识别', icon: 'Camera' },
  { path: '/history', label: '历史数据', icon: 'DataAnalysis' },
  { path: '/persons', label: '人员管理', icon: 'User' },
  { path: '/logs', label: '操作日志', icon: 'Document' },
]

onMounted(async () => {
  try { await api.getDevices(); connected.value = true } catch { connected.value = false }
})
</script>

<style scoped>
.app-layout { display:flex; min-height:100vh; background:#0d1015; }
.sidenav { width:210px; flex-shrink:0; background:#12171f; border-right:1px solid #1e2530; display:flex; flex-direction:column; }
.logo { padding:20px 18px 14px; display:flex; align-items:center; gap:10px; }
.logo-icon { width:32px; height:32px; border-radius:9px; background:linear-gradient(145deg,#f2a950,#c47a2c); display:flex; align-items:center; justify-content:center; color:#1a1206; }
.logo-title { font-weight:700; font-size:14px; }
.logo-sub { font-size:10px; color:#6b7686; }
nav { flex:1; padding:6px 10px; display:flex; flex-direction:column; gap:2px; }
.nav-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; color:#8b95a3; text-decoration:none; font-size:13.5px; transition:.15s; }
.nav-item:hover { background:#1a2230; color:#e9e6df; }
.nav-active { background:#1f2a3a; color:#f2a950 !important; }
.sidenav-footer { padding:14px 18px; border-top:1px solid #1e2530; display:flex; align-items:center; gap:8px; font-size:11px; color:#8b95a3; }
.dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.main-content { flex:1; min-width:0; overflow-y:auto; }
</style>
