<template>
  <div class="page">
    <h1>物体识别</h1>
    <div class="detect-zone">
      <el-upload :auto-upload="false" :show-file-list="false" :on-change="doDetect" drag accept="image/*">
        <el-icon :size="36"><Camera /></el-icon>
        <div style="margin-top:10px">拖拽或点击上传图片检测</div>
      </el-upload>
      <el-checkbox v-model="linkage" style="margin-top:8px" label="检测到目标时自动开灯" />
    </div>

    <div v-if="loading" style="text-align:center;padding:40px">
      <el-icon :size="32" class="is-loading"><Loading /></el-icon>
      <div style="margin-top:8px;color:#8b95a3">识别中...</div>
    </div>

    <div v-if="result" class="result-area">
      <div class="image-compare">
        <div class="image-box">
          <div class="image-label">原图</div>
          <el-image :src="result.image_url" fit="contain" style="max-height:400px" />
        </div>
        <div class="image-box">
          <div class="image-label">标注图</div>
          <el-image :src="result.annotated_url" fit="contain" style="max-height:400px" />
        </div>
      </div>
      <div class="section-title" style="margin-top:16px">检测结果 ({{ result.detections?.length || 0 }} 项)</div>
      <el-table :data="result.detections" style="width:100%" size="small" v-if="result.detections?.length">
        <el-table-column prop="cls" label="类别" />
        <el-table-column prop="conf" label="置信度">
          <template #default="{ row }">
            <el-progress :percentage="+(row.conf*100).toFixed(1)" :color="row.conf > 0.7 ? '#34d399' : row.conf > 0.4 ? '#f2a950' : '#f87171'" />
          </template>
        </el-table-column>
        <el-table-column prop="box" label="位置框 (x1,y1,x2,y2)">
          <template #default="{ row }">{{ row.box?.map(v=>+v.toFixed(0)).join(', ') }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../api'
import { Camera, Loading } from '@element-plus/icons-vue'

const result = ref(null)
const loading = ref(false)
const linkage = ref(false)

const doDetect = async (file) => {
  loading.value = true; result.value = null
  try {
    result.value = await api.detect(file.raw, linkage.value ? 1 : 0)
  } catch {}
  loading.value = false
}
</script>

<style scoped>
.page { padding:24px 28px; }
.page h1 { margin:0 0 20px; font-size:18px; }
.detect-zone { max-width:500px; margin:0 auto; }
.image-compare { display:flex; gap:16px; margin-top:20px; }
.image-box { flex:1; background:#151b24; border:1px solid #1e2530; border-radius:10px; padding:12px; }
.image-label { font-size:12px; color:#6b7686; margin-bottom:8px; }
.section-title { font-size:13px; font-weight:600; color:#8b95a3; margin-bottom:8px; }
</style>
