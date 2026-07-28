import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://lnmiit-booking-backend-430o.onrender.com'

const client = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,   // 60s — Render free tier cold starts can take 30-50s
})

// Attach JWT on every request
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 → logout
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
