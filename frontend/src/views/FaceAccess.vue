<template>
  <div class="face-page">
    <div class="face-tabs">
      <button :class="['ft',{active:tab==='verify'}]" @click="tab='verify'">门禁验证</button>
      <button :class="['ft',{active:tab==='lib'}]" @click="tab='lib'">人脸库管理</button>
    </div>

    <!-- VERIFY TAB -->
    <div v-if="tab==='verify'" class="verify-row">
      <div class="card verify-stage" @drop.prevent="onDrop" @dragover.prevent @click="state==='idle'?doUpload():null" @paste="onPaste">
        <!-- Idle -->
        <div v-if="state==='idle'" class="upload-zone">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#f2a950" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5"/><path d="M8 9l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
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
        <div v-if="state==='scanning'" class="scan-box">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2"/></svg>
          <div class="scan-line"></div>
          <div class="scan-c tl"></div><div class="scan-c tr"></div><div class="scan-c bl"></div><div class="scan-c br"></div>
          <div class="scan-loader"><span class="scan-spin"></span>识别中…</div>
        </div>

        <!-- Pass -->
        <div v-if="state==='pass'" class="result-wrap">
          <div class="door-anim">
            <div class="door-left"></div><div class="door-right"></div>
            <div class="door-lock"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#46b98a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V8a5 5 0 0 1 9.9-1"/><rect x="5" y="11" width="14" height="9" rx="2"/></svg></div>
          </div>
          <div class="pass-info">
            <span class="pass-avatar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.4"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/></svg></span>
            <div><div class="pass-title">欢迎回家，{{ result?.person?.name || result?.name || '已识别' }}</div><div class="pass-sub">相似度 <span class="pass-score">{{ scoreText }}</span> · 门已开启</div></div>
          </div>
          <button @click="reset" class="btn-reset">再验证一次</button>
        </div>

        <!-- Deny -->
        <div v-if="state==='deny'" class="deny-card">
          <span class="deny-avatar" @click="lightbox?.({caption:'抓拍照片'})">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="1.5"><circle cx="12" cy="9" r="3.4"/><path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/></svg>
          </span>
          <div>
            <div class="deny-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="2"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg> 未授权人员，已拒绝开门</div>
            <div class="deny-sub">相似度 <span class="deny-score">{{ scoreText }}</span> 低于阈值</div>
            <div v-if="result?.notified" class="deny-push"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#46b98a" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg> 已推送告警至户主微信</div>
            <div v-else class="deny-push" style="color:#6b7686"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7686" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg> 告警推送未配置</div>
          </div>
          <button @click="reset" class="btn-reset">重新验证</button>
        </div>

        <!-- NoFace -->
        <div v-if="state==='noface'" class="noface-block">
          <div class="noface-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#98a2b0" stroke-width="1.5"><circle cx="12" cy="9" r="3.4"/><path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/><path d="M4 4l16 16" stroke="#e5544b"/></svg></div>
          <div class="noface-text">未检测到人脸，请换一张正面照片</div>
          <button @click="reset" class="btn-reset">重新上传</button>
        </div>

        <!-- Error -->
        <div v-if="state==='error'" class="noface-block">
          <div class="noface-icon" style="border-color:#3a1c1a"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="1.5" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
          <div class="noface-text" style="color:#f4a9a4">后端未连接，验证未执行</div>
          <button @click="reset" class="btn-reset">重试</button>
        </div>
      </div>

      <div class="card history-card">
        <div class="card-title">最近 5 次验证</div>
        <div v-for="h in history" :key="h.id" class="h-item">
          <span class="h-dot" :style="{background:h.pass?'#46b98a':'#e5544b'}"></span>
          <div style="flex:1"><div class="h-label" :style="{color:h.pass?'#46b98a':'#e5544b'}">{{ h.pass ? (h.name||'通过') : '拒绝' }}</div><div class="h-meta">相似度 {{ h.score }} · {{ h.time }}</div></div>
        </div>
        <EmptyState v-if="!history.length" icon="clock" text="暂无验证记录" />
      </div>
    </div>

    <!-- LIB TAB -->
    <div v-if="tab==='lib'" class="lib-page">
      <div v-for="g in library" :key="g.person_id" class="card lib-group">
        <div class="lib-head">
          <span class="lib-avatar" :style="{background:g.tone||'#2a3442'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.4"><circle cx="12" cy="9" r="3.2"/><path d="M6 20c.8-2.7 3.2-4 6-4s5.2 1.3 6 4"/></svg></span>
          <span class="lib-name">{{ g.name }}</span>
          <span class="lib-role" :style="{background:g.role==='owner'?'#2a2113':g.role==='family'?'#182a22':'#1c232e',color:g.role==='owner'?'#f2a950':g.role==='family'?'#46b98a':'#98a2b0'}">{{ g.role==='owner'?'户主':g.role==='family'?'家人':'访客' }}</span>
          <span class="lib-count">已录入 {{ g.faces?.length || 0 }} 张特征</span>
          <button @click="doEnroll(g.person_id)" class="lib-add">+ 追加照片</button>
        </div>
        <div class="lib-faces">
          <div v-for="f in (g.faces||[])" :key="f.id" class="lib-face" @mouseenter="showDel=f.id" @mouseleave="showDel=null">
            <img v-if="f.image_path" :src="f.image_path" class="lib-img" />
            <svg v-else class="lib-ph-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.2"><circle cx="12" cy="9" r="3.4"/><path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/></svg>
            <button v-if="showDel===f.id" @click="doDelFace(f.id)" class="lib-del">&times;</button>
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
    const h = { id: Date.now(), pass: d.pass, name: d.person?.name, score: d.score?.toFixed(2) || '0.00', time: dayjs().format('HH:mm') }
    history.value = [h, ...history.value].slice(0, 5)
    showToast(d.pass ? 'success' : 'error', d.pass ? `欢迎回家${d.person?.name ? '，'+d.person.name : ''}` : '未授权人员，已拒绝开门')
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
    const h = { id: Date.now(), pass: r.pass, name: r.name, score: r.score.toFixed(2), time: dayjs().format('HH:mm') }
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
  try { const r = await api.getLogs({ page: 1, size: 5 }); history.value = (r.items||[]).filter(l=>l.action==='door_open'||l.action==='door_deny').map(l=>({id:l.id,pass:l.action==='door_open',name:l.operator,score:l.detail?.score?.toFixed(2)||'0.00',time:dayjs(l.ts).format('HH:mm')})) } catch {}
}

onMounted(() => { fetchLogs(); fetchLib() })
</script>

<style scoped>
.face-page{max-width:1100px;margin:0 auto}
.face-tabs{display:flex;gap:6px;margin-bottom:18px}
.ft{padding:8px 18px;border-radius:8px;border:1px solid #2a3442;background:#1c232e;color:#98a2b0;cursor:pointer;font-size:13px;font-family:inherit;transition:.15s}
.ft.active{background:rgba(242,169,80,.1);border-color:#f2a950;color:#f2a950}
.ft:hover:not(.active){color:#e9e6df}
.card{background:#181f29;border:1px solid #232c39;border-radius:14px;padding:16px 18px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
.card-title{font-size:12px;font-weight:700;color:#b9c1cd;margin-bottom:10px}
.verify-row{display:grid;grid-template-columns:1fr 280px;gap:18px;align-items:start}
.verify-stage{min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer}
.upload-zone{text-align:center;max-width:480px}
.upload-zone svg{margin-bottom:12px}
.upload-text{font-size:14px;color:#c4ccd6;margin-bottom:4px}
.upload-hint{font-size:11px;color:#6b7686;margin-bottom:18px}
.demo-cta{display:flex;gap:8px;align-items:center;justify-content:center}
.demo-label{font-size:11px;color:#6b7686}
.btn-demo{padding:6px 12px;border-radius:7px;border:1px solid;cursor:pointer;font-size:11px;font-family:inherit;transition:.15s}
.btn-demo:hover{filter:brightness(1.15)}
.btn-pass{background:#16281f;border-color:#2f6b4f;color:#7fd6ab}
.btn-deny{background:#281615;border-color:#6b2f2c;color:#f4a9a4}
.btn-noface{background:#1c232e;border-color:#3a4757;color:#98a2b0}
.scan-box{position:relative;width:240px;height:280px;border-radius:14px;background:linear-gradient(135deg,#2a3442,#141a23);border:1px solid #3a4757;display:flex;align-items:center;justify-content:center;overflow:hidden}
.scan-line{position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#f2a950,transparent);box-shadow:0 0 12px #f2a950;animation:scanline 1.4s ease-in-out infinite alternate}
.scan-c{position:absolute;width:20px;height:20px;border-color:#f2a950;border-style:solid}
.tl{left:10px;top:10px;border-width:2px 0 0 2px}.tr{right:10px;top:10px;border-width:2px 2px 0 0}
.bl{left:10px;bottom:10px;border-width:0 0 2px 2px}.br{right:10px;bottom:10px;border-width:0 2px 2px 0}
.scan-loader{position:absolute;bottom:14px;display:flex;align-items:center;gap:8px;color:#f2a950;font-size:14px}
.scan-spin{width:14px;height:14px;border:2px solid #f2a950;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.result-wrap{text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
.door-anim{position:relative;width:200px;height:120px;border-radius:10px;overflow:hidden;background:#0f141b;border:1px solid #2f6b4f}
.door-left,.door-right{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(135deg,#243a2e,#16241c)}
.door-left{left:0;border-right:1px solid #2f6b4f;animation:doorL 1.4s cubic-bezier(.7,0,.3,1) forwards}
.door-right{right:0;border-left:1px solid #2f6b4f;animation:doorR 1.4s cubic-bezier(.7,0,.3,1) forwards}
.door-lock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.pass-info{display:flex;align-items:center;gap:10px}
.pass-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5a4a2f,#2a2113);display:flex;align-items:center;justify-content:center;border:2px solid #46b98a;flex-shrink:0}
.pass-title{font-size:18px;font-weight:700;color:#8ce0b8}
.pass-sub{font-size:11px;color:#98a2b0;margin-top:2px}
.pass-score{font-family:'JetBrains Mono',monospace;color:#f2a950;font-variant-numeric:tabular-nums}
.btn-reset{margin-top:12px;padding:7px 16px;border-radius:8px;border:1px solid #2a3442;background:#1c232e;color:#b9c1cd;cursor:pointer;font-size:12px;font-family:inherit;transition:border-color .15s}
.btn-reset:hover{border-color:#33404f;color:#e9e6df}
.deny-card{display:flex;gap:14px;padding:18px;border-radius:12px;background:rgba(229,84,75,.08);border:1px solid rgba(229,84,75,.3);align-items:center;max-width:400px;flex-wrap:wrap}
.deny-avatar{width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#3a1c1a,#1a1210);border:1px solid #6b2f2c;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.deny-title{font-size:16px;font-weight:700;color:#f4a9a4;display:flex;align-items:center;gap:6px}
.deny-sub{font-size:11px;color:#c49a97;margin-top:4px}
.deny-score{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
.deny-push{font-size:11px;color:#98a2b0;margin-top:4px;display:flex;align-items:center;gap:4px}
.noface-block{display:flex;flex-direction:column;align-items:center;gap:14px}
.noface-icon{width:64px;height:64px;border-radius:50%;background:#1c232e;display:flex;align-items:center;justify-content:center;border:1px solid #3a4757}
.noface-text{font-size:14px;color:#c4ccd6}
.history-card{display:flex;flex-direction:column;gap:8px}
.h-item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:#141a23;border:1px solid #222b37}
.h-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.h-label{font-size:12px;font-weight:500}
.h-meta{font-size:10px;color:#6b7686;font-variant-numeric:tabular-nums}
.lib-page{display:flex;flex-direction:column;gap:14px}
.lib-group{padding:15px 16px}
.lib-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.lib-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.lib-name{font-size:14px;font-weight:700}
.lib-role{font-size:10px;padding:2px 7px;border-radius:5px}
.lib-count{font-size:11px;color:#6b7686}
.lib-add{margin-left:auto;padding:5px 12px;border-radius:7px;border:1px dashed #33404f;background:transparent;color:#6b7686;cursor:pointer;font-size:11px;font-family:inherit;transition:.15s}
.lib-add:hover{color:#e9e6df;border-color:#4a5767}
.lib-faces{display:flex;flex-wrap:wrap;gap:10px}
.lib-face{position:relative;width:90px;height:110px;border-radius:10px;overflow:hidden;background:linear-gradient(135deg,#2a3442,#141a23);border:1px solid #2a3442;display:flex;align-items:center;justify-content:center}
.lib-img{width:100%;height:100%;object-fit:cover}
.lib-ph-svg{opacity:.3}
.lib-del{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:6px;border:none;background:rgba(229,84,75,.85);color:#fff;cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center}
</style>
