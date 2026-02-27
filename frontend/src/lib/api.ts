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
  login: (username: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', username)
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
  journalStatus: () => api.get<JournalStatus>('/connectors/journal/status'),
}

// Health
export const healthApi = {
  check: () => api.get<HealthStatus>('/health'),
}

// Metrics
export const metricsApi = {
  overview: () => api.get<MetricsOverview>('/metrics/overview'),
}

// Transform
export const transformApi = {
  getConfig: (connectorId: string) =>
    api.get<TransformConfig>(`/connectors/${connectorId}/transform`),
  save: (connectorId: string, mapping: FieldMapping, exportEnabled?: boolean) =>
    api.patch(`/connectors/${connectorId}/transform`, {
      mapping,
      ...(exportEnabled !== undefined ? { export_enabled: exportEnabled } : {}),
    }),
  toggleExport: (connectorId: string, enabled: boolean) =>
    api.patch<{ export_enabled: boolean; connector_id: string }>(
      `/connectors/${connectorId}/transform/export`,
      { enabled },
    ),
}

// Types
export interface User {
  id: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  username: string
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
  host?: string
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
  connection_ms: number | null
  sample_records: Record<string, unknown>[] | null
  normalized_preview: CanonicalEvent[] | null
  note: string | null
}

export interface JournalStatus {
  has_data: boolean
  total: number
  by_type: Record<string, number>
  earliest: number | null
  latest: number | null
  error?: string
}

export interface HealthStatus {
  status: string
  database: string
  loki: string
  grafana: string
  journal: {
    events: number
    table_size: string
  }
}

export interface FieldMapping {
  timestamp_field?: string
  message_field?: string
  severity_field?: string
  area_field?: string
  equipment_field?: string
  alarm_type_field?: string
  state_field?: string
  value_field?: string
  threshold_field?: string
  priority_field?: string
  vendor_id_field?: string
}

export interface CanonicalEvent {
  timestamp: string
  message: string
  labels: {
    severity: string
    area: string
    equipment: string
    alarm_type: string
    isa_priority: string
    source: string
    connector_id: string
  }
  metadata: {
    state: string
    value: unknown
    threshold: unknown
    priority: unknown
    vendor_alarm_id: string
    ack_required: boolean
    shelved: boolean
  }
}

export interface TransformConfig {
  connector_type: string
  connector_name: string
  sample_raw: Record<string, unknown>[]
  mapping: FieldMapping
  preview: CanonicalEvent[]
  available_fields: string[]
  export_enabled: boolean
}

export interface MetricsOverview {
  alarm_rate: { time: number; count: number }[]
  by_severity: { severity: string; count: number }[]
  totals: { last_1h: number; last_24h: number }
  connectors: {
    total: number
    connected: number
    error: number
    disconnected: number
    enabled: number
    export_enabled: number
    connectors: {
      id: string
      name: string
      connector_type: string
      host: string
      status: string
      enabled: boolean
      last_successful_pull: string | null
      error_message: string | null
    }[]
  }
}

export default api
