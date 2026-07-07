<template>
  <div class="layout" @paste="onPasteGlobal">
    <aside class="sidenav">
      <div class="logo">
        <div class="logo-icon">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 11.5 12 4l9 7.5"/>
            <path d="M5 10v9h14v-9"/>
            <path d="M10 19v-5h4v5"/>
          </svg>
        </div>
        <div>
          <div class="logo-title">智享家</div>
          <div class="logo-sub">SMART HOME OS</div>
        </div>
      </div>
      <nav>
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="nav-item" active-class="active">
          <span v-html="item.svg"></span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="nav-footer">
        <span class="dot" :style="{background: conColor, boxShadow: `0 0 8px ${conColor}`}"></span>
        <span>{{ online === true ? '后端已连接' : online === false ? '离线' : '检测中…' }}</span>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <h1>{{ pageTitle }}</h1>
          <span class="topbar-sub">{{ pageSub }}</span>
        </div>
        <div class="topbar-right">
          <div class="clock-block">
            <div class="clock-time">{{ clock }}</div>
            <div class="clock-date">{{ dateStr }}</div>
          </div>
          <div class="scene-btns">
            <button v-for="s in scenes" :key="s.key" @click="doScene(s.key)" :class="['scene-btn', sceneActive === s.key ? 'scene-' + s.key : '']">{{ s.label }}</button>
          </div>
        </div>
      </header>
      <div v-if="online === false" class="offline-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e07b30" stroke-width="2" stroke-linecap="round">
          <path d="M12 8v5M12 16.5v.5"/>
          <circle cx="12" cy="12" r="9"/>
        </svg>
        <span>后端服务未连接 — 页面数据可能不是最新</span>
      </div>
      <div class="page-body">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="$route.path" :online="online" :setOnline="setOnline" :showToast="showToast" :confirm="showConfirm" :lightbox="showLightbox" :picker="pickFile" />
        </RouterView>
      </div>
    </main>

    <!-- Toasts -->
    <div class="toast-stack" v-if="toasts.length">
      <div v-for="t in toasts" :key="t.id" :class="['toast', 'toast-' + t.kind]" :style="{ animation: `toastIn .3s ease` }">
        <span class="toast-dot" :style="{ background: t.kind === 'success' ? '#2dbd7a' : t.kind === 'error' ? '#e5544b' : '#f2a950' }"></span>
        <span>{{ t.msg }}</span>
        <button v-if="t.closable" @click="dismissToast(t.id)" class="toast-close">&times;</button>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <div v-if="confirmData" class="overlay" @click.self="confirmData.onCancel?.()">
      <div class="dialog">
        <div class="dialog-title">{{ confirmData.title }}</div>
        <div class="dialog-text">{{ confirmData.text }}</div>
        <div class="dialog-actions">
          <button @click="confirmData.onCancel?.()" class="btn-cancel">取消</button>
          <button @click="confirmData.onOk?.()" class="btn-ok" :style="{ background: confirmData.okBg || '#e5544b' }">{{ confirmData.okText || '确定' }}</button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="lightboxData" class="overlay lb-overlay" @click="lightboxData = null">
      <div class="lb-box">
        <div class="lb-img" :style="{ background: `linear-gradient(135deg, ${lightboxData.c1 || '#f0f2f5'}, ${lightboxData.c2 || '#e8eaed'})` }">
          <img v-if="lightboxData.src" :src="lightboxData.src" style="max-width: 100%; max-height: 70vh; object-fit: contain" />
          <svg v-else width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1">
            <circle cx="12" cy="8" r="3.5"/>
            <path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2"/>
          </svg>
        </div>
        <div class="lb-caption">{{ lightboxData.caption }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, provide } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import dayjs from 'dayjs'

const route = useRoute()
const online = ref(null)
const clock = ref('')
const dateStr = ref('')
const toasts = ref([])
const confirmData = ref(null)
const lightboxData = ref(null)
const sceneActive = ref('')
provide('sceneActive', sceneActive)
let _tid = 0, clockTimer = null, sensorTimer = null

const conColor = computed(() => online.value === true ? '#2dbd7a' : online.value === false ? '#f2a950' : '#b0b8c4')

const pageTitle = computed(() => {
  const m = { Dashboard: '监控大屏', Face: '人脸门禁', Detect: '物体识别', History: '历史数据', Persons: '人员管理', Logs: '操作日志' }
  return m[route.name] || route.name || ''
})
const pageSub = computed(() => {
  const m = { Dashboard: '实时家居状态', Face: '门禁验证与人脸库', Detect: 'YOLOv8 物体检测', History: '温湿度趋势与事件记录', Persons: '家庭成员信息', Logs: '操作审计日志' }
  return m[route.name] || ''
})

const scenes = [{ key: 'away', label: '离家' }, { key: 'home', label: '回家' }, { key: 'night', label: '睡眠' }]

const setOnline = (v) => { online.value = v }
const showToast = (kind, msg, closable = false) => {
  const id = ++_tid
  toasts.value.push({ id, kind, msg, closable })
  if (!closable) setTimeout(() => toasts.value = toasts.value.filter(t => t.id !== id), 2500)
}
const dismissToast = (id) => { toasts.value = toasts.value.filter(t => t.id !== id) }
const showConfirm = (opts) => {
  confirmData.value = { ...opts, onOk: () => { confirmData.value = null; opts.onOk?.() }, onCancel: () => { confirmData.value = null; opts.onCancel?.() } }
}
const showLightbox = (opts) => { lightboxData.value = opts }
const pickFile = (accept) => new Promise(resolve => {
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = accept || 'image/*'
  inp.onchange = () => resolve(inp.files?.[0] || null)
  inp.click()
})

const onPasteGlobal = (e) => {
  const items = e.clipboardData?.items
  if (items) for (const item of items) {
    if (item.type.startsWith('image/')) {
      const f = item.getAsFile()
      if (f) document.dispatchEvent(new CustomEvent('paste-image', { detail: f }))
    }
  }
}

const doScene = async (name) => {
  sceneActive.value = name
  try { await api.activateScene(name); setOnline(true); showToast('success', `已切换至${name === 'away' ? '离家' : name === 'home' ? '回家' : '睡眠'}模式`) } catch { showToast('error', '场景切换失败') }
}

const fetchConnect = async () => {
  try { await api.getDevices(); online.value = true } catch { online.value = false }
}

const restoreScene = async () => {
  try {
    const r = await api.getLogs({ page: 1, size: 50 })
    const last = (r.items || []).find(l => typeof l.action === 'string' && l.action.startsWith('scene_'))
    if (last) sceneActive.value = last.action.replace('scene_', '')
  } catch {}
}

onMounted(() => {
  fetchConnect(); restoreScene(); sensorTimer = setInterval(fetchConnect, 15000)
  clockTimer = setInterval(() => {
    const n = dayjs(); clock.value = n.format('HH:mm:ss'); dateStr.value = n.format('YYYY年MM月DD日 dddd')
  }, 1000)
})
onUnmounted(() => { clearInterval(clockTimer); clearInterval(sensorTimer) })

const navSVG = {
  Dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  Face: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="11" r="3.2"/><path d="M7.5 17c.9-1.7 2.6-2.4 4.5-2.4s3.6.7 4.5 2.4"/></svg>',
  Detect: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>',
  History: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></svg>',
  Persons: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.9-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><path d="M16 5.5a3 3 0 0 1 0 5.6M18.5 19c-.3-1.9-1.3-3.2-2.7-3.9"/></svg>',
  Logs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 5h11M8 12h11M8 19h11"/><circle cx="4" cy="5" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="19" r="1.2"/></svg>',
}
const navItems = Object.entries(navSVG).map(([name, svg]) => ({ path: '/' + name.toLowerCase(), label: name === 'Dashboard' ? '监控大屏' : name === 'Face' ? '人脸门禁' : name === 'Detect' ? '物体识别' : name === 'History' ? '历史数据' : name === 'Persons' ? '人员管理' : '操作日志', svg }))
</script>

<style scoped>
.layout { display: flex; min-height: 100vh }
.sidenav { width: 210px; flex-shrink: 0; background: #ffffff; border-right: 1px solid #e4e8ed; display: flex; flex-direction: column; box-shadow: 2px 0 8px rgba(0,0,0,0.04) }
.logo { padding: 20px 18px 14px; display: flex; align-items: center; gap: 10px }
.logo-icon { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(145deg, #e07b30, #c96a25); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 14px rgba(224, 123, 48, 0.3) }
.logo-title { font-weight: 700; font-size: 14px; letter-spacing: .3px; color: var(--text-primary) }
.logo-sub { font-size: 10px; color: var(--text-muted); letter-spacing: .5px }
nav { flex: 1; padding: 6px 10px; display: flex; flex-direction: column; gap: 2px }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; transition: all .15s; }
.nav-item:hover { background: var(--bg-hover); color: var(--text-primary) }
.nav-item.active { background: var(--accent-light); color: var(--accent); }
.nav-footer { padding: 14px 18px; border-top: 1px solid var(--border-light); display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted) }
.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0 }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden }
.topbar { height: 60px; flex-shrink: 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); z-index: 20; }
.topbar-left { display: flex; align-items: baseline; gap: 12px }
.topbar-left h1 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary) }
.topbar-sub { font-size: 11px; color: var(--text-muted) }
.topbar-right { display: flex; align-items: center; gap: 16px }
.offline-banner { display: flex; align-items: center; justify-content: center; gap: 8px; height: 34px; flex-shrink: 0; background: var(--warning-light); border-bottom: 1px solid rgba(242, 169, 80, 0.3); color: #b07a2a; font-size: 12px; animation: fadeIn .2s ease }
.clock-block { text-align: right }
.clock-time { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 500; letter-spacing: .5px; font-variant-numeric: tabular-nums; color: var(--text-primary) }
.clock-date { font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums }
.scene-btns { display: flex; gap: 4px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 3px }
.scene-btn { padding: 6px 12px; border-radius: 7px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 12px; font-family: inherit; transition: .15s }
.scene-btn:hover { background: var(--bg-hover); color: var(--text-primary) }
.scene-away { background: var(--warning-light) !important; color: #b07a2a !important }
.scene-home { background: var(--success-light) !important; color: #1a9a5c !important }
.scene-night { background: var(--info-light) !important; color: #3a6acc !important }
.page-body { flex: 1; overflow: auto; padding: 20px 24px 30px }
.toast-stack { position: fixed; top: 70px; right: 20px; z-index: 90; display: flex; flex-direction: column; gap: 8px }
.toast { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; background: #ffffff; border: 1px solid var(--border-color); box-shadow: 0 8px 24px rgba(0,0,0,0.1); min-width: 240px; }
.toast-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0 }
.toast-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; margin-left: auto }
.overlay { position: fixed; inset: 0; z-index: 95; background: rgba(0,0,0,0.4); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center }
.dialog { width: 380px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.15) }
.dialog-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary) }
.dialog-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6 }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px }
.btn-cancel { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-color); background: #ffffff; color: var(--text-secondary); cursor: pointer; font-size: 12px; font-family: inherit }
.btn-ok { padding: 8px 16px; border-radius: 8px; border: none; color: #fff; cursor: pointer; font-size: 12px; font-weight: 500; font-family: inherit }
.lb-overlay { cursor: zoom-out }
.lb-box { max-width: 70vw; background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden }
.lb-img { padding: 24px; display: flex; align-items: center; justify-content: center; min-width: 300px; min-height: 200px }
.lb-caption { padding: 8px 14px; font-size: 11px; color: rgba(0,0,0,0.7); background: #f5f7fa }
</style>
