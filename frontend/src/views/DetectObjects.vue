<template>
  <div class="detect-page">
    <div v-if="state === 'idle'" class="card detect-upload" @click="doDetect">
      <div class="upload-inner">
        <div class="upload-icon">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V5"/>
            <path d="M8 9l4-4 4 4"/>
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
          </svg>
        </div>
        <div class="upload-main">点击上传图片进行物体识别（YOLOv8）</div>
        <div class="upload-sub">支持 JPG / PNG，拖拽或点击上传</div>
        <div class="demo-cta" style="margin-top: 12px">
          <button @click.stop="loadDemo" class="btn-demo">载入示例结果（演示）</button>
        </div>
      </div>
      <div class="linkage-row">
        <div class="linkage-toggle" @click.stop="linkage = !linkage">
          <span :class="['lt-sw', {on: linkage}]"><span class="lt-knob"></span></span>
          <span class="lt-label">检出后联动控灯 <code>?linkage=1</code></span>
        </div>
      </div>
    </div>

    <div v-if="state === 'infer'" class="infer-row">
      <div class="shimmer-box"></div>
      <div class="shimmer-box infer-label">
        <div class="infer-loader"><span class="infer-spin"></span>推理中…</div>
      </div>
    </div>

    <div v-if="state === 'error'" class="card error-box">
      <div class="error-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5544b" stroke-width="1.5" stroke-linecap="round">
          <path d="M12 8v5M12 16.5v.5"/>
          <circle cx="12" cy="12" r="9"/>
        </svg>
      </div>
      <div class="error-text">后端未连接，请检查服务后重试</div>
      <button @click="state = 'idle'" class="btn-reset">重试</button>
    </div>

    <div v-if="state === 'done' && result" class="done-page">
      <div class="done-header">
        <button @click="state = 'idle'; result = null" class="btn-reset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 16V5M8 9l4-4 4 4"/>
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
          </svg> 上传新图
        </button>
      </div>
      <div class="compare-row">
        <div class="card img-card" @click="lightbox?.({caption: '原图', src: result.image_url, c1: '#f5f7fa', c2: '#fafbfc'})">
          <div class="img-label">
            <span>原图</span>
            <span class="img-hint">点击放大</span>
          </div>
          <div class="img-wrap">
            <img v-if="result.image_url" :src="result.image_url" style="max-width: 100%; max-height: 300px; object-fit: contain" />
            <svg v-else width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <circle cx="8.5" cy="9.5" r="1.8"/>
              <path d="M4 18l5-4 4 3 3-2 4 3"/>
            </svg>
          </div>
        </div>
        <div class="card img-card" @click="lightbox?.({caption: '标注图 · 检出 ' + result.detections.length + ' 个目标', src: result.annotated_url, c1: '#f5f7fa', c2: '#fafbfc'})">
          <div class="img-label">
            <span>标注图 · 检出 {{ result.detections?.length || 0 }} 个目标</span>
            <span class="img-hint">点击放大</span>
          </div>
          <div class="img-wrap">
            <img v-if="result.annotated_url" :src="result.annotated_url" style="max-width: 100%; max-height: 300px; object-fit: contain" />
            <svg v-else width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <circle cx="8.5" cy="9.5" r="1.8"/>
              <path d="M4 18l5-4 4 3 3-2 4 3"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="card result-table">
        <div class="card-title">识别结果 · {{ result.detections?.length || 0 }} 项</div>
        <div class="rt-row rt-header">
          <span>类别</span>
          <span>置信度</span>
          <span>框坐标 [x1,y1,x2,y2]</span>
        </div>
        <div v-for="d in result.detections" :key="d.cls + d.conf" class="rt-row">
          <span>
            <span :style="{width: '8px', height: '8px', borderRadius: '2px', background: clsColor(d.cls), display: 'inline-block', marginRight: '6px'}"></span>
            {{ clsLabel(d.cls) }}
            <span style="color: var(--text-muted); font-size: 10px">{{ d.cls }}</span>
          </span>
          <span class="conf-bar">
            <span class="conf-fill" :style="{width: (d.conf * 100) + '%', background: confColor(d.conf)}"></span>
            <span class="conf-text">{{ +(d.conf * 100).toFixed(1) }}%</span>
          </span>
          <span class="box-text">{{ d.box?.map(v => +v.toFixed(0)).join(', ') }}</span>
        </div>
      </div>

      <div class="card hist-strip">
        <div class="card-title" style="margin-bottom: 8px">历史识别</div>
        <div class="hist-list">
          <div v-for="h in history" :key="h.id" class="hist-item" @click="viewHist(h)">
            <div class="hist-thumb">
              <img v-if="h.annotated_url" :src="h.annotated_url" style="width: 100%; height: 100%; object-fit: cover" />
              <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="8.5" cy="9.5" r="1.8"/>
                <path d="M4 18l5-4 4 3 3-2 4 3"/>
              </svg>
            </div>
            <div class="hist-count">{{ h.detections?.length || 0 }} 目标</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'

const props = defineProps(['online', 'setOnline', 'showToast', 'lightbox', 'picker'])
const { showToast, setOnline, lightbox, picker } = props

const state = ref('idle')
const result = ref(null)
const history = ref([])
const linkage = ref(false)

const clsLabel = (c) => ({person:'人', car:'车', cat:'猫', dog:'狗', chair:'椅子', laptop:'笔记本', tv:'电视', bottle:'瓶子', sofa:'沙发', cup:'杯子', bicycle:'自行车', potted_plant:'盆栽'}[c] || c)
const clsColor = (c) => ({person:'#2dbd7a', car:'#5b8def', cat:'#e07b30', dog:'#d4824b', chair:'#9b7bc4', laptop:'#5bd0e0', tv:'#d67ba0', bottle:'#7cb85a', sofa:'#d6b06a', cup:'#5ab9b9', bicycle:'#c98b6a', potted_plant:'#6abe7a'}[c] || '#8a95a5')
const confColor = (c) => c > 0.7 ? '#2dbd7a' : c > 0.4 ? '#e07b30' : '#e5544b'

const doDetect = async () => {
  const f = await picker('image/*')
  if (!f) return
  state.value = 'infer'; result.value = null
  try {
    const d = await api.detect(f, linkage.value ? 1 : 0)
    setOnline(true)
    result.value = d; state.value = 'done'
    history.value = [{id: Date.now(), ...d}, ...history.value].slice(0, 6)
    showToast('success', `识别完成，检出 ${d.detections?.length || 0} 个目标`)
  } catch (e) {
    if (e.isBusiness) {
      state.value = 'idle'
      showToast('error', e.message)
    } else {
      setOnline(false)
      state.value = 'error'
      showToast('error', '后端未连接，识别未执行')
    }
  }
}

const loadDemo = () => {
  state.value = 'infer'
  setTimeout(() => {
    const r = { image_url: '', annotated_url: '', detections: [{cls: 'person', conf: 0.92, box: [34, 50, 220, 290]}, {cls: 'sofa', conf: 0.81, box: [210, 150, 460, 300]}, {cls: 'laptop', conf: 0.74, box: [120, 190, 210, 250]}] }
    result.value = r; state.value = 'done'
    showToast('success', `识别完成（演示），检出 3 个目标`)
  }, 1400)
}

const viewHist = (item) => { result.value = item; state.value = 'done' }

const fetchHistory = async () => {
  try {
    const r = await api.getDetections({ page: 1, size: 6 })
    history.value = (r.items || []).map(d => ({ id: d.id, image_url: d.image_url, annotated_url: d.annotated_url, detections: d.detections }))
  } catch {}
}
onMounted(fetchHistory)
</script>

<style scoped>
.detect-page { max-width: 1100px; margin: 0 auto }
.card { background: #ffffff; border: 1px solid #e4e8ed; border-radius: 14px; padding: 16px 18px; box-shadow: var(--shadow-sm) }
.card-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px }
.detect-upload { border: 2px dashed #d0d5dd; text-align: center; cursor: pointer; background: radial-gradient(70% 70% at 50% 30%, rgba(91, 141, 239, 0.05), transparent); transition: border-color .2s }
.detect-upload:hover { border-color: #5b8def }
.upload-inner { padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 10px }
.upload-icon { width: 80px; height: 80px; border-radius: 50%; background: #e8f0fd; display: flex; align-items: center; justify-content: center; margin-bottom: 8px }
.upload-main { font-size: 14px; color: var(--text-primary) }
.upload-sub { font-size: 11px; color: var(--text-muted) }
.demo-cta { display: flex; justify-content: center }
.btn-demo { padding: 6px 14px; border-radius: 7px; border: 1px dashed #c0c8d4; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 11px; font-family: inherit }
.btn-demo:hover { color: var(--text-primary); border-color: #8a95a5 }
.linkage-row { display: flex; justify-content: center; padding: 10px 0 6px }
.linkage-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer }
.lt-sw { width: 38px; height: 22px; border-radius: 11px; background: #e4e8ed; border: 1px solid #d0d5dd; position: relative; transition: .2s; flex-shrink: 0 }
.lt-sw.on { background: #e07b30; border-color: #e07b30 }
.lt-knob { position: absolute; top: 1px; left: 1px; width: 18px; height: 18px; border-radius: 50%; background: #ffffff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15) }
.lt-sw.on .lt-knob { left: 17px }
.lt-label { font-size: 11px; color: var(--text-primary) }
.lt-label code { font-size: 10px; color: var(--text-muted) }
.infer-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px }
.shimmer-box { aspect-ratio: 16/10; border-radius: 12px; background: linear-gradient(100deg, #f5f7fa, #fafbfc, #f5f7fa); background-size: 320px 100%; animation: shimmer 1.2s linear infinite; border: 1px solid #e4e8ed }
.infer-label { display: flex; align-items: center; justify-content: center }
.infer-loader { display: flex; align-items: center; gap: 8px; color: #5b8def; font-size: 13px }
.infer-spin { width: 14px; height: 14px; border: 2px solid #5b8def; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block }
.error-box { text-align: center; padding: 48px 20px }
.error-icon { width: 64px; height: 64px; border-radius: 50%; background: #fde8e7; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px }
.error-text { font-size: 14px; color: #c4453b; margin-bottom: 16px }
.btn-reset { padding: 7px 14px; border-radius: 8px; border: 1px solid #e4e8ed; background: #ffffff; color: var(--text-secondary); cursor: pointer; font-size: 12px; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: border-color .15s }
.btn-reset:hover { border-color: #c0c8d4; color: var(--text-primary) }
.done-header { display: flex; justify-content: flex-end; margin-bottom: 12px }
.compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px }
.img-card { cursor: zoom-in; transition: border-color .15s }
.img-card:hover { border-color: #c0c8d4 }
.img-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; display: flex; justify-content: space-between }
.img-hint { color: var(--text-muted) }
.img-wrap { border-radius: 10px; overflow: hidden; background: linear-gradient(135deg, #f5f7fa, #fafbfc); min-height: 150px; display: flex; align-items: center; justify-content: center }
.result-table { margin-top: 14px }
.rt-row { display: grid; grid-template-columns: 140px 1fr 200px; gap: 12px; align-items: center; padding: 10px 4px; border-bottom: 1px solid #f0f2f5; font-size: 12px }
.rt-header { font-size: 10px; color: var(--text-muted); padding-bottom: 6px }
.conf-bar { display: flex; align-items: center; gap: 8px }
.conf-fill { height: 5px; background: #2dbd7a; border-radius: 3px }
.conf-text { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-primary); font-variant-numeric: tabular-nums; width: 36px }
.box-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums }
.hist-strip { margin-top: 0 }
.hist-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px }
.hist-item { position: relative; flex-shrink: 0; width: 140px; aspect-ratio: 16/10; border-radius: 9px; overflow: hidden; cursor: pointer; background: linear-gradient(135deg, #f5f7fa, #fafbfc); border: 1px solid #e4e8ed; display: flex; align-items: center; justify-content: center; transition: border-color .15s }
.hist-item:hover { border-color: #c0c8d4 }
.hist-count { position: absolute; right: 5px; bottom: 5px; font-size: 9px; color: var(--text-primary); background: rgba(255,255,255,0.9); padding: 1px 6px; border-radius: 5px }
</style>
