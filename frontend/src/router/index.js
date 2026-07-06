import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/face', name: 'Face', component: () => import('../views/FaceAccess.vue') },
  { path: '/detect', name: 'Detect', component: () => import('../views/DetectObjects.vue') },
  { path: '/history', name: 'History', component: () => import('../views/History.vue') },
  { path: '/persons', name: 'Persons', component: () => import('../views/Persons.vue') },
  { path: '/logs', name: 'Logs', component: () => import('../views/Logs.vue') },
]

export default createRouter({ history: createWebHashHistory(), routes })
