<template>
  <div class="empty-state">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c0c8d4" :stroke-width="sw" stroke-linecap="round" stroke-linejoin="round" v-html="paths[icon] || paths.list"></svg>
    <div class="empty-text">{{ text }}</div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'list' },
  text: { type: String, default: '暂无数据' }
})
const sw = 1.3
const paths = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  person: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5"/>',
  frame: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"/><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"/><path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16"/><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  face: '<path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="11" r="3.2"/><path d="M7.5 17c.9-1.7 2.6-2.4 4.5-2.4s3.6.7 4.5 2.4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.1"/><circle cx="4" cy="12" r="1.1"/><circle cx="4" cy="18" r="1.1"/>',
  activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
}
</script>

<style scoped>
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 28px 12px }
.empty-text { font-size: 12px; color: var(--text-muted) }
</style>
