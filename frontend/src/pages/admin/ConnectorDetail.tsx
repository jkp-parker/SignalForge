import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectorsApi, type ConnectorCreate, type ConnectorTestResult } from '../../lib/api'
import {
  ArrowLeft, Zap, Trash2, Save, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'

const CONNECTOR_TYPES = [
  { value: 'ignition', label: 'Ignition' },
  { value: 'factorytalk', label: 'FactoryTalk' },
  { value: 'wincc', label: 'WinCC' },
  { value: 'plant_scada', label: 'Plant SCADA' },
]

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400',
  low: 'text-blue-400', warning: 'text-yellow-400', error: 'text-red-400',
}

export default function ConnectorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [testResult, setTestResult] = useState<ConnectorTestResult | null>(null)
  const [showPollData, setShowPollData] = useState(false)

  const { data: connector, isLoading } = useQuery({
    queryKey: ['connector', id],
    queryFn: () => connectorsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ConnectorCreate>) => connectorsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connector', id] })
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
    },
  })

  const testMutation = useMutation({
    mutationFn: () => connectorsApi.test(id!),
    onSuccess: ({ data }) => {
      setTestResult(data)
      setShowPollData(true)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(id!),
    onSuccess: () => navigate('/admin/connectors'),
  })

  if (isLoading) return <p className="text-sm text-gray-400">Loading...</p>
  if (!connector) return <p className="text-sm text-red-400">Connector not found</p>

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    updateMutation.mutate({
      name: form.get('name') as string,
      connector_type: form.get('connector_type') as string,
      description: form.get('description') as string,
      host: form.get('host') as string,
      port: parseInt(form.get('port') as string) || 8088,
      polling_interval: parseInt(form.get('polling_interval') as string) || 30,
      enabled: form.get('enabled') === 'on',
    })
  }

  const rawFields = testResult?.sample_records?.[0]
    ? Object.keys(testResult.sample_records[0])
    : []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary" onClick={() => navigate('/admin/connectors')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{connector.name}</h1>
          <p className="text-sm text-gray-400">
            {CONNECTOR_TYPES.find((t) => t.value === connector.connector_type)?.label || connector.connector_type}
            {' '}— {connector.host}:{connector.port}
          </p>
        </div>
      </div>

      {/* ── Config + Status ── */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Edit form */}
        <div className="col-span-2 card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Configuration</h3>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" defaultValue={connector.name} required />
              </div>
              <div>
                <label className="label">Type</label>
                <select name="connector_type" className="input" defaultValue={connector.connector_type}>
                  {CONNECTOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Host</label>
                <input name="host" className="input" defaultValue={connector.host} required />
              </div>
              <div>
                <label className="label">Port</label>
                <input name="port" type="number" className="input" defaultValue={connector.port} />
              </div>
              <div>
                <label className="label">Polling Interval (seconds)</label>
                <input name="polling_interval" type="number" className="input" defaultValue={connector.polling_interval} />
              </div>
              <div>
                <label className="label">Description</label>
                <input name="description" className="input" defaultValue={connector.description} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="enabled"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  defaultChecked={connector.enabled}
                />
                <label className="text-sm text-gray-300">Enabled</label>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                <Zap className="h-4 w-4" />
                {testMutation.isPending ? 'Testing...' : 'Test Connection & Poll'}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (confirm(`Delete connector "${connector.name}"?`)) {
                    deleteMutation.mutate()
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </form>

          {updateMutation.isSuccess && (
            <div className="mt-4 p-3 rounded-md text-sm bg-green-900/30 text-green-400 border border-green-700/50">
              Connector updated successfully
            </div>
          )}
        </div>

        {/* Status panel */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Status</h3>
          <div className="space-y-3">
            <StatusRow label="Status" value={connector.status} />
            <StatusRow label="Enabled" value={connector.enabled ? 'Yes' : 'No'} />
            <StatusRow
              label="Last Poll"
              value={connector.last_successful_pull
                ? new Date(connector.last_successful_pull).toLocaleString()
                : 'Never'}
            />
            {connector.error_message && (
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Error</div>
                <div className="text-sm text-red-400">{connector.error_message}</div>
              </div>
            )}
            <StatusRow label="Created" value={new Date(connector.created_at).toLocaleString()} />
            <StatusRow label="Updated" value={new Date(connector.updated_at).toLocaleString()} />
          </div>
        </div>
      </div>

      {/* ── Connection + Data Poll Results ── */}
      {testResult && (
        <div className="card overflow-hidden">
          {/* Connection result header */}
          <div
            className={`flex items-center gap-3 p-4 border-b border-gray-700 cursor-pointer select-none ${
              testResult.success ? 'bg-green-900/20' : 'bg-red-900/20'
            }`}
            onClick={() => setShowPollData((v) => !v)}
          >
            {testResult.success
              ? <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {testResult.message}
              </p>
              {testResult.connection_ms !== null && (
                <p className="text-xs text-gray-500 mt-0.5">Latency: {testResult.connection_ms}ms</p>
              )}
            </div>
            <span className="text-xs text-gray-500 mr-1">Simulated data poll</span>
            {showPollData
              ? <ChevronUp className="h-4 w-4 text-gray-500" />
              : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </div>

          {/* Expandable poll data */}
          {showPollData && (
            <div className="p-5">
              {testResult.note && (
                <p className="text-xs text-yellow-500/80 bg-yellow-900/20 border border-yellow-800/30 rounded-md px-3 py-2 mb-5">
                  ⚠ {testResult.note}
                </p>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Raw data */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Raw Vendor Data ({connector.connector_type})
                  </h4>
                  {testResult.sample_records && testResult.sample_records.length > 0 ? (
                    <div className="space-y-3">
                      {testResult.sample_records.map((record, i) => (
                        <div key={i} className="rounded-md border border-gray-700 bg-gray-900 p-3 text-xs font-mono">
                          {rawFields.map((field) => (
                            <div key={field} className="flex gap-2 py-0.5">
                              <span className="text-gray-500 w-32 shrink-0 truncate">{field}</span>
                              <span className="text-gray-300 truncate" title={String(record[field] ?? '')}>
                                {record[field] === null || record[field] === undefined
                                  ? <em className="text-gray-600">null</em>
                                  : typeof record[field] === 'boolean'
                                  ? <span className={record[field] ? 'text-green-400' : 'text-red-400'}>{String(record[field])}</span>
                                  : String(record[field])}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No sample data available</p>
                  )}
                </div>

                {/* Arrow divider */}
                <div className="relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                    <span className="text-[10px] text-gray-600 -rotate-90 whitespace-nowrap mt-1">transform</span>
                  </div>

                  {/* Canonical output */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Canonical Output → Loki
                    </h4>
                    {testResult.normalized_preview && testResult.normalized_preview.length > 0 ? (
                      <div className="space-y-3">
                        {testResult.normalized_preview.map((event, i) => (
                          <div key={i} className="rounded-md border border-blue-900/40 bg-gray-900 p-3 text-xs font-mono space-y-2">
                            <div>
                              <span className="text-gray-600">timestamp: </span>
                              <span className="text-cyan-400">{event.timestamp}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">message: </span>
                              <span className="text-gray-200">{event.message}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(event.labels).filter(([, v]) => v).map(([k, v]) => (
                                <span key={k} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 bg-gray-800 border border-gray-700">
                                  <span className="text-gray-500">{k}=</span>
                                  <span className={SEVERITY_COLORS[String(v)] ?? 'text-gray-300'}>
                                    &quot;{String(v)}&quot;
                                  </span>
                                </span>
                              ))}
                            </div>
                            <div className="text-gray-600">
                              {Object.entries(event.metadata)
                                .filter(([, v]) => v !== null && v !== undefined)
                                .map(([k, v]) => `${k}=${v}`)
                                .join('  ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No normalized preview available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  )
}
