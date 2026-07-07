<template>
  <div class="face-page">
    <div class="face-tabs">
      <button :class="['ft', {active: tab === 'verify'}]" @click="tab = 'verify'">门禁验证</button>
      <button :class="['ft', {active: tab === 'lib'}]" @click="tab = 'lib'">人脸库管理</button>
    </div>

    <!-- VERIFY TAB -->
    <div v-if="tab === 'verify'" class="verify-row">
      <div class="card verify-stage" @drop.prevent="onDrop" @dragover.prevent @click="state === 'idle' ? doUpload() : null" @paste="onPaste">
        <!-- Idle -->
        <div v-if="state === 'idle'" class="upload-zone">
          <div class="upload-icon">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#e07b30" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 16V5"/>
              <path d="M8 9l4-4 4 4"/>
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
            </svg>
          </div>
          <div class="upload-text">拖拽 / 点击上传照片，支持 Ctrl+V 粘贴</div>
          <div class="upload-hint">JPG / PNG，建议正面清晰照</div>
          <div class="demo-cta">
            <span class="demo-label">现场演示：</span>
            <button @click.stop="simVerify('pass')" class="btn-demo btn-pass">模拟通过</button>
            <button @click.stop="simVerify('deny')" class="btn-demo btn-deny">模拟拒绝</button>
            <button @click.stop="simVerify('noface')" class="btn-demo btn-noface">无人脸</button>
          </div>
        </div>

        <!-- Scanning -->
        <div v-if="state === 'scanning'" class="scan-box">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1">
            <circle cx="12" cy="8" r="3.5"/>
            <path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2"/>
          </svg>
          <div class="scan-line"></div>
          <div class="scan-c tl"></div><div class="scan-c tr"></div><div class="scan-c bl"></div><div class="scan-c br"></div>
          <div class="scan-loader"><span class="scan-spin"></span>识别中…</div>
        </div>

        <!-- Pass -->
        <div v-if="state === 'pass'" class="result-wrap">
          <div class="door-anim">
            <div class="door-left"></div><div class="door-right"></div>
            <div class="door-lock">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2dbd7a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 11V8a5 5 0 0 1 9.9-1"/>
                <rect x="5" y="11" width="14" height="9" rx="2"/>
              </svg>
            </div>
          </div>
          <div class="pass-info">
            <span class="pass-avatar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.4">
                <circle cx="12" cy="8" r="3.4"/>
                <path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/>
              </svg>
            </span>
            <div>
              <div class="pass-title">欢迎回家，{{ result?.person?.name || result?.name || '已识别' }}</div>
              <div class="pass-sub">相似度 <span class="pass-score">{{ scoreText }}</span> · 门已开启</div>
            </div>
          </div>
          <button @click="reset" class="btn-reset">再验证一次</button>
        </div>

        <!-- Deny -->
        <div v-if="state === 'deny'" class="deny-card">
          <span class="deny-avatar" @click="lightbox?.({caption: '抓拍照片'})">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="1.5">
              <circle cx="12" cy="9" r="3.4"/>
              <path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/>
            </svg>
          </span>
          <div>
            <div class="deny-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="2">
                <path d="M12 8v5M12 16.5v.5"/>
                <circle cx="12" cy="12" r="9"/>
              </svg> 未授权人员，已拒绝开门
            </div>
            <div class="deny-sub">相似度 <span class="deny-score">{{ scoreText }}</span> 低于阈值</div>
            <div v-if="result?.notified" class="deny-push">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2dbd7a" stroke-width="2">
                <path d="M20 6 9 17l-5-5"/>
              </svg> 已推送告警至户主微信
            </div>
            <div v-else class="deny-push" style="color: var(--text-muted)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 8v5M12 16.5v.5"/>
              </svg> 告警推送未配置
            </div>
          </div>
          <button @click="reset" class="btn-reset">重新验证</button>
        </div>

        <!-- NoFace -->
        <div v-if="state === 'noface'" class="noface-block">
          <div class="noface-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8a95a5" stroke-width="1.5">
              <circle cx="12" cy="9" r="3.4"/>
              <path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/>
              <path d="M4 4l16 16" stroke="#e5544b"/>
            </svg>
          </div>
          <div class="noface-text">未检测到人脸，请换一张正面照片</div>
          <button @click="reset" class="btn-reset">重新上传</button>
        </div>

        <!-- Error -->
        <div v-if="state === 'error'" class="noface-block">
          <div class="noface-icon" style="border-color: #fde8e7">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="1.5" stroke-linecap="round">
              <path d="M12 8v5M12 16.5v.5"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <div class="noface-text" style="color: #c4453b">后端未连接，验证未执行</div>
          <button @click="reset" class="btn-reset">重试</button>
        </div>
      </div>

      <div class="card history-card">
        <div class="card-title">最近 5 次验证</div>
        <div v-for="h in history" :key="h.id" class="h-item">
          <span class="h-dot" :style="{background: h.pass ? '#2dbd7a' : '#e5544b'}"></span>
          <div style="flex: 1">
            <div class="h-label" :style="{color: h.pass ? '#2dbd7a' : '#e5544b'}">{{ h.pass ? (h.name || '通过') : '拒绝' }}</div>
            <div class="h-meta"><span class="h-method" :style="{color:h.method==='键盘'?'#5bd0e0':'#f2a950'}">{{ h.method }}</span> · {{ h.score!=='--' ? '相似度 '+h.score+' · ' : '' }}{{ h.time }}</div>
          </div>
        </div>
        <EmptyState v-if="!history.length" icon="clock" text="暂无验证记录" />
      </div>
    </div>

    <!-- LIB TAB -->
    <div v-if="tab === 'lib'" class="lib-page">
      <div v-for="g in library" :key="g.person_id" class="card lib-group">
        <div class="lib-head">
          <span class="lib-avatar" :style="{background: g.tone || '#fef3e8'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1.4">
              <circle cx="12" cy="9" r="3.2"/>
              <path d="M6 20c.8-2.7 3.2-4 6-4s5.2 1.3 6 4"/>
            </svg>
          </span>
          <span class="lib-name">{{ g.name }}</span>
          <span class="lib-role" :style="{background: g.role === 'owner' ? '#fef6ed' : g.role === 'family' ? '#e8f5ee' : '#f5f7fa', color: g.role === 'owner' ? '#b07a2a' : g.role === 'family' ? '#1a9a5c' : '#4a5568'}">{{ g.role === 'owner' ? '户主' : g.role === 'family' ? '家人' : '访客' }}</span>
          <span class="lib-count">已录入 {{ g.faces?.length || 0 }} 张特征</span>
          <button @click="doEnroll(g.person_id)" class="lib-add">+ 追加照片</button>
        </div>
        <div class="lib-faces">
          <div v-for="f in (g.faces || [])" :key="f.id" class="lib-face" @mouseenter="showDel = f.id" @mouseleave="showDel = null">
            <img v-if="f.image_path" :src="f.image_path" class="lib-img" />
            <svg v-else class="lib-ph-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1.2">
              <circle cx="12" cy="9" r="3.4"/>
              <path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/>
            </svg>
            <button v-if="showDel === f.id" @click="doDelFace(f.id)" class="lib-del">&times;</button>
          </div>
        </div>
      </div>
      <EmptyState v-if="!library.length" icon="person" text="尚未录入人脸，请先创建人员" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import EmptyState from '../components/EmptyState.vue'
import dayjs from 'dayjs'

const props = defineProps(['online', 'setOnline', 'showToast', 'confirm', 'lightbox', 'picker'])
const { showToast, setOnline, lightbox, picker } = props

const tab = ref('verify')
const state = ref('idle')
const result = ref(null)
const history = ref([])
const library = ref([])
const showDel = ref(null)

const scoreText = computed(() => result.value?.score ? (result.value.score * 100).toFixed(1) + '%' : '--')

const doUpload = async () => {
  const f = await picker('image/*')
  if (!f) return
  state.value = 'scanning'; result.value = null
  try {
    const d = await api.faceVerify(f)
    setOnline(true)
    result.value = d
    state.value = d.pass ? 'pass' : 'deny'
    const h = { id: Date.now(), pass: d.pass, name: d.person?.name, method:'人脸', score: d.score?.toFixed(2) || '0.00', time: dayjs().format('HH:mm') }
    history.value = [h, ...history.value].slice(0, 5)
    showToast(d.pass ? 'success' : 'error', d.pass ? `欢迎回家${d.person?.name ? '，' + d.person.name : ''}` : '未授权人员，已拒绝开门')
  } catch (e) {
    if (e.isBusiness) {
      state.value = 'noface'
      showToast('info', e.message)
    } else {
      setOnline(false)
      state.value = 'error'
      showToast('error', '后端未连接，验证未执行')
    }
  }
}

const simVerify = (kind) => {
  state.value = 'scanning'; result.value = null
  setTimeout(() => {
    if (kind === 'noface') { state.value = 'noface'; showToast('info', '未检测到人脸'); return }
    const r = kind === 'deny' ? { pass: false, score: 0.21 } : { pass: true, name: '张三', score: 0.87 }
    result.value = r; state.value = kind === 'deny' ? 'deny' : 'pass'
    const h = { id: Date.now(), pass: r.pass, name: r.name, method:'人脸', score: r.score.toFixed(2), time: dayjs().format('HH:mm') }
    history.value = [h, ...history.value].slice(0, 5)
    showToast(kind === 'deny' ? 'error' : 'success', kind === 'deny' ? '未授权人员，已拒绝开门' : `欢迎回家，${r.name}`)
  }, 1800)
}

const reset = () => { state.value = 'idle'; result.value = null }

const fetchLib = async () => {
  try { library.value = await api.faceLibrary(); setOnline(true) } catch {}
}
const doEnroll = async (personId) => {
  const f = await picker('image/*')
  if (!f) return
  try { await api.faceEnroll(personId, f); setOnline(true); fetchLib(); showToast('success', '人脸录入成功') }
  catch (e) {
    if (e.isBusiness) showToast('error', e.message)
    else { setOnline(false); showToast('error', '后端未连接，录入未执行') }
  }
}
const doDelFace = async (faceId) => {
  props.confirm({ title: '删除人脸照片', text: '确定删除该人脸特征？删除后这张照片将不再用于识别。', okText: '删除', okBg: '#e5544b', onOk: async () => {
    try { await api.deleteFace(faceId); fetchLib(); showToast('success', '已删除') } catch { showToast('error', '删除失败') }
  }})
}

const fetchLogs = async () => {
  try { const r = await api.getLogs({ page: 1, size: 10 }); history.value = (r.items||[]).filter(l=>l.action==='door_open'||l.action==='door_deny').slice(0,5).map(l=>{
    const kp = l.operator==='keypad' || l.detail?.method==='keypad'
    return {id:l.id,pass:l.action==='door_open',name:kp?'键盘':l.operator,method:kp?'键盘':'人脸',score:l.detail?.score!=null?l.detail.score.toFixed(2):'--',time:dayjs(l.ts).format('HH:mm')}
  }) } catch {}
}

onMounted(() => { fetchLogs(); fetchLib() })
</script>

<style scoped>
</style>
