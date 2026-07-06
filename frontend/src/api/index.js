import axios from 'axios'

const http = axios.create({ baseURL: '/', timeout: 15000 })

http.interceptors.response.use(
  (res) => {
    const d = res.data
    if (d.code !== 0 && d.code !== undefined) {
      console.error('API error:', d.msg || '请求失败')
      return Promise.reject(new Error(d.msg))
    }
    return d.data
  },
  (err) => {
    console.error('Network error:', err.message || '网络错误')
    return Promise.reject(err)
  }
)

export const api = {
  // Persons
  getPersons: (params) => http.get('/api/persons', { params }),
  createPerson: (data) => http.post('/api/persons', data),
  getPerson: (id) => http.get(`/api/persons/${id}`),
  updatePerson: (id, data) => http.put(`/api/persons/${id}`, data),
  deletePerson: (id) => http.delete(`/api/persons/${id}`),
  uploadFile: (file) => { const fd = new FormData(); fd.append('file', file); return http.post('/api/upload', fd) },

  // Detect
  detect: (file, linkage = 0) => { const fd = new FormData(); fd.append('file', file); return http.post(`/api/detect?linkage=${linkage}`, fd) },

  // Face
  faceEnroll: (personId, file) => { const fd = new FormData(); fd.append('file', file); return http.post(`/api/face/enroll?person_id=${personId}`, fd) },
  faceVerify: (file) => { const fd = new FormData(); fd.append('file', file); return http.post('/api/face/verify', fd) },
  faceLibrary: () => http.get('/api/face/library'),
  deleteFace: (id) => http.delete(`/api/face/${id}`),

  // Devices
  getDevices: () => http.get('/api/devices'),
  deviceCommand: (deviceId, state) => http.post(`/api/devices/${deviceId}/command`, { action: 'set', state }),

  // Scenes
  activateScene: (name) => http.post(`/api/scene/${name}`),

  // Logs
  getLogs: (params) => http.get('/api/logs', { params }),

  // Sensors
  sensorsLatest: () => http.get('/api/sensors/latest'),
  sensorsHistory: (params) => http.get('/api/sensors/history', { params }),
}

export default http
