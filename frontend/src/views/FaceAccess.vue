<template>
  <div class="page">
    <h1>人脸门禁</h1>
    <el-tabs v-model="tab" type="border-card">
      <!-- Tab 1: Verify -->
      <el-tab-pane label="门禁验证" name="verify">
        <div class="verify-zone">
          <el-upload ref="uploadVerify" :auto-upload="false" :show-file-list="false" :on-change="doVerify" drag accept="image/*">
            <el-icon :size="40"><UploadFilled /></el-icon>
            <div style="margin-top:12px">拖拽或点击上传人脸照片</div>
            <div style="font-size:12px;color:#6b7686;margin-top:4px">支持 JPG / PNG</div>
          </el-upload>
        </div>

        <!-- Result Card -->
        <div v-if="result" class="result-card" :class="result.pass ? 'result-pass' : 'result-deny'">
          <div v-if="result.pass" class="result-title">✅ 欢迎回家{{ result.person ? '，' + result.person.name : '' }}</div>
          <div v-else class="result-title">🚫 未授权人员，已拒绝开门</div>
          <div class="result-score">相似度: {{ (result.score * 100).toFixed(1) }}%</div>
          <el-image v-if="result.snapshot_url" :src="result.snapshot_url" style="max-width:300px;border-radius:8px;margin-top:12px" fit="cover" />
          <div v-if="!result.pass" style="font-size:12px;color:#8b95a3;margin-top:8px">已推送告警至户主微信</div>
        </div>

        <div v-if="recentVerify.length" style="margin-top:20px">
          <div class="section-title">最近验证记录</div>
          <div class="verify-history">
            <div v-for="r in recentVerify" :key="r.id" class="history-item" :class="r.action === 'door_deny' ? 'item-deny' : 'item-pass'">
              <span>{{ r.action === 'door_open' ? '通过' : '拒绝' }}</span>
              <span>{{ r.operator }}</span>
              <span style="margin-left:auto;font-size:11px;color:#6b7686">{{ formatTime(r.ts) }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Tab 2: Library -->
      <el-tab-pane label="人脸库" name="library">
        <div class="toolbar">
          <el-select v-model="enrollPersonId" placeholder="选择人员" style="width:200px">
            <el-option v-for="p in persons" :key="p.id" :label="p.name + ' (' + (p.face_count||0) + '张)'" :value="p.id" />
          </el-select>
          <el-upload :auto-upload="false" :show-file-list="false" :on-change="doEnroll" accept="image/*">
            <el-button type="primary" :disabled="!enrollPersonId">+ 录入人脸</el-button>
          </el-upload>
        </div>
        <div v-if="!library.length" class="empty-text">暂无已录入人脸</div>
        <div v-for="g in library" :key="g.person_id" class="lib-group">
          <div class="lib-header">
            <span class="lib-name">{{ g.name }}</span>
            <span class="lib-count">已录入 {{ g.faces?.length || 0 }} 张</span>
          </div>
          <div class="lib-faces">
            <div v-for="f in g.faces" :key="f.id" class="face-thumb">
              <el-image :src="f.image_path" fit="cover" style="width:90px;height:90px;border-radius:8px" />
              <el-button size="small" type="danger" circle :icon="Delete" @click="doDeleteFace(f.id)" style="position:absolute;top:2px;right:2px" />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { api } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const tab = ref('verify')
const result = ref(null)
const enrollPersonId = ref(null)
const persons = ref([])
const library = ref([])
const recentVerify = ref([])

const formatTime = (t) => t ? dayjs(t).format('MM-DD HH:mm:ss') : ''

const doVerify = async (file) => {
  result.value = null
  try {
    const r = await api.faceVerify(file.raw)
    result.value = r
    fetchRecent()
  } catch {}
}

const doEnroll = async (file) => {
  if (!enrollPersonId.value) return
  try {
    await api.faceEnroll(enrollPersonId.value, file.raw)
    ElMessage.success('人脸录入成功')
    fetchLibrary()
  } catch {}
}

const doDeleteFace = async (id) => {
  await ElMessageBox.confirm('确定删除该人脸特征?', '确认', { type: 'warning' })
  await api.deleteFace(id)
  ElMessage.success('已删除')
  fetchLibrary()
}

const fetchPersons = async () => {
  try { const r = await api.getPersons({ page: 1, size: 100 }); persons.value = r.items || [] } catch {}
}
const fetchLibrary = async () => {
  try { library.value = await api.faceLibrary() } catch {}
}
const fetchRecent = async () => {
  try { const r = await api.getLogs({ page: 1, size: 5 }); recentVerify.value = (r.items||[]).filter(l => l.action === 'door_open' || l.action === 'door_deny') } catch {}
}

onMounted(() => { fetchPersons(); fetchLibrary(); fetchRecent() })
watch(tab, (v) => { if (v === 'library') { fetchPersons(); fetchLibrary() } else { fetchRecent() } })
</script>

<style scoped>
.page { padding:24px 28px; }
.page h1 { margin:0 0 20px; font-size:18px; }
.verify-zone { max-width:500px; margin:0 auto; }
.result-card { margin-top:24px; padding:24px; border-radius:12px; text-align:center; }
.result-pass { background:rgba(52,211,153,.08); border:1px solid rgba(52,211,153,.2); }
.result-deny { background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.2); }
.result-title { font-size:18px; font-weight:700; margin-bottom:8px; }
.result-score { font-size:14px; color:#8b95a3; }
.section-title { font-size:13px; font-weight:600; color:#8b95a3; margin-bottom:8px; }
.verify-history { display:flex; flex-direction:column; gap:4px; }
.history-item { display:flex; gap:10px; padding:8px 12px; border-radius:6px; font-size:13px; }
.item-pass { color:#34d399; background:rgba(52,211,153,.05); }
.item-deny { color:#f87171; background:rgba(248,113,113,.05); }
.toolbar { display:flex; gap:12px; margin-bottom:16px; align-items:center; }
.lib-group { margin-bottom:16px; background:#151b24; border:1px solid #1e2530; border-radius:10px; padding:14px; }
.lib-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.lib-name { font-size:15px; font-weight:600; }
.lib-count { font-size:12px; color:#6b7686; }
.lib-faces { display:flex; flex-wrap:wrap; gap:10px; }
.face-thumb { position:relative; }
.empty-text { text-align:center; padding:40px; color:#6b7686; }
</style>
