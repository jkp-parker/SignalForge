import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Auth
export const authApi = {
  login: (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    return api.post<{ access_token: string; token_type: string }>('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  me: () => api.get<User>('/auth/me'),
}

// Users
export const usersApi = {
  list: () => api.get<User[]>('/users'),
  create: (data: UserCreate) => api.post<User>('/users', data),
  get: (id: string) => api.get<User>(`/users/${id}`),
  update: (id: string, data: Partial<UserCreate>) => api.patch<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
}

// Connectors
export const connectorsApi = {
  list: () => api.get<Connector[]>('/connectors'),
  create: (data: ConnectorCreate) => api.post<Connector>('/connectors', data),
  get: (id: string) => api.get<Connector>(`/connectors/${id}`),
  update: (id: string, data: Partial<ConnectorCreate>) => api.patch<Connector>(`/connectors/${id}`, data),
  delete: (id: string) => api.delete(`/connectors/${id}`),
  test: (id: string) => api.post<ConnectorTestResult>(`/connectors/${id}/test`),
}

// Health
export const healthApi = {
  check: () => api.get<HealthStatus>('/health'),
}

// Types
export interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  email: string
  password: string
  full_name: string
  role: string
}

export interface Connector {
  id: string
  name: string
  connector_type: string
  description: string
  host: string
  port: number
  credentials: Record<string, string>
  connection_params: Record<string, string>
  polling_interval: number
  alarm_filters: Record<string, unknown>
  label_mappings: Record<string, string>
  enabled: boolean
  status: string
  last_successful_pull: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ConnectorCreate {
  name: string
  connector_type: string
  description?: string
  host: string
  port?: number
  credentials?: Record<string, string>
  connection_params?: Record<string, string>
  polling_interval?: number
  alarm_filters?: Record<string, unknown>
  label_mappings?: Record<string, string>
  enabled?: boolean
}

export interface ConnectorTestResult {
  success: boolean
  message: string
}

export interface HealthStatus {
  status: string
  database: string
  loki: string
}

export default api
