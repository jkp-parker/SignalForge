import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectorsApi, type ConnectorCreate, type ConnectorTestResult, type JournalStatus } from '../../lib/api'
import {
  ArrowLeft, Save, Trash2, CheckCircle2, XCircle, Zap,
  ChevronDown, ChevronUp, ArrowRight, Copy, Check, RefreshCw,
  Database, Settings, Eye, Wrench, ExternalLink,
  Flame, Factory, Monitor, Cpu,
} from 'lucide-react'

const CONNECTOR_TYPES = [
  { value: 'ignition', label: 'Ignition', vendor: 'Inductive Automation', icon: Flame },
  { value: 'factorytalk', label: 'FactoryTalk', vendor: 'Rockwell Automation', icon: Factory },
  { value: 'wincc', label: 'WinCC', vendor: 'Siemens', icon: Monitor },
  { value: 'plant_scada', label: 'Plant SCADA', vendor: 'AVEVA (Citect)', icon: Cpu },
]

const STEPS = [
  { num: 1, label: 'Connector Details', icon: Settings },
  { num: 2, label: 'Alarm Journal Setup', icon: Database },
  { num: 3, label: 'Test & Preview', icon: Eye },
  { num: 4, label: 'Transform & Export', icon: Wrench },
]

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400',
  low: 'text-blue-400', warning: 'text-yellow-400', error: 'text-red-400',
}

export default function ConnectorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeStep, setActiveStep] = useState(1)
  const [saveMsg, setSaveMsg] = useState('')

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
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2000)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(id!),
    onSuccess: () => navigate('/admin/connectors'),
  })

  if (isLoading) return <p className="text-sm text-gray-400">Loading...</p>
  if (!connector) return <p className="text-sm text-red-400">Connector not found</p>

  const connType = CONNECTOR_TYPES.find((t) => t.value === connector.connector_type)
  const Icon = connType?.icon || Cpu
  const isSaved = !!connector.name && !!connector.connector_type

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary" onClick={() => navigate('/admin/connectors')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-lg p-2 bg-blue-600/20 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-100">{connector.name}</h1>
          <p className="text-sm text-gray-400">
            {connType?.label || connector.connector_type}
            {connType?.vendor && <span className="text-gray-600 ml-1.5">({connType.vendor})</span>}
          </p>
        </div>
        <button
          className="btn-danger text-xs"
          onClick={() => {
            if (confirm(`Delete connector "${connector.name}"?`)) deleteMutation.mutate()
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        {STEPS.map((step, i) => {
          const isActive = activeStep === step.num
          const isCompleted = step.num < activeStep || (step.num === 1 && isSaved)
          const isClickable = step.num === 1 || isSaved
          const StepIcon = step.icon

          return (
            <div key={step.num} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && setActiveStep(step.num)}
                disabled={!isClickable}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all w-full ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : isCompleted
                    ? 'text-green-400 hover:bg-gray-700/50 cursor-pointer'
                    : isClickable
                    ? 'text-gray-400 hover:bg-gray-700/50 cursor-pointer'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                      : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    step.num
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-medium truncate">{step.label}</div>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-600 shrink-0 mx-1" />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      {activeStep === 1 && (
        <Step1Details
          connector={connector}
          onSave={(data) => updateMutation.mutate(data)}
          saving={updateMutation.isPending}
          saveMsg={saveMsg}
          onNext={() => setActiveStep(2)}
        />
      )}
      {activeStep === 2 && (
        <Step2JournalSetup connectorType={connector.connector_type} />
      )}
      {activeStep === 3 && (
        <Step3TestPreview
          connectorId={id!}
          connectorType={connector.connector_type}
        />
      )}
      {activeStep === 4 && (
        <Step4Transform connectorId={id!} />
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          className="btn-secondary"
          onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
          disabled={activeStep === 1}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {activeStep < 4 && (
          <button
            className="btn-primary"
            onClick={() => setActiveStep(activeStep + 1)}
            disabled={!isSaved}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 1 — Connector Details
   ═══════════════════════════════════════════════════════════════════════════ */

function Step1Details({
  connector,
  onSave,
  saving,
  saveMsg,
  onNext,
}: {
  connector: any
  onSave: (data: Partial<ConnectorCreate>) => void
  saving: boolean
  saveMsg: string
  onNext: () => void
}) {
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    onSave({
      name: form.get('name') as string,
      connector_type: form.get('connector_type') as string,
      description: form.get('description') as string,
      host: form.get('host') as string,
      port: parseInt(form.get('port') as string) || 8088,
      polling_interval: parseInt(form.get('polling_interval') as string) || 30,
      enabled: form.get('enabled') === 'on',
    })
  }

  return (
    <div className="grid grid-cols-3 gap-6">
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
              <label className="label">Host / Gateway IP</label>
              <input name="host" className="input" defaultValue={connector.host} placeholder="e.g. 192.168.1.100" />
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

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveMsg && (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {saveMsg}
              </span>
            )}
          </div>
        </form>
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
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 2 — Alarm Journal Database Setup
   ═══════════════════════════════════════════════════════════════════════════ */

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm text-gray-200 bg-gray-900 rounded px-3 py-2 border border-gray-700 font-mono select-all">
          {value}
        </code>
        <button
          onClick={copy}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          title="Copy"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function Step2JournalSetup({ connectorType }: { connectorType: string }) {
  const [journalStatus, setJournalStatus] = useState<JournalStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkJournal = async () => {
    try {
      const { data } = await connectorsApi.journalStatus()
      setJournalStatus(data)
      return data
    } catch {
      setJournalStatus({ has_data: false, total: 0, by_type: {}, earliest: null, latest: null, error: 'Failed to check' })
      return null
    }
  }

  const startPolling = () => {
    setPolling(true)
    checkJournal()
    pollRef.current = setInterval(checkJournal, 5000)
  }

  const stopPolling = () => {
    setPolling(false)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }

  useEffect(() => {
    checkJournal()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const isIgnition = connectorType === 'ignition'

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Instructions */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          {isIgnition ? 'Ignition Alarm Journal Setup' : 'Alarm Database Setup'}
        </h3>

        {isIgnition ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Configure your Ignition gateway to write alarm journal data directly to SignalForge's PostgreSQL database.
              Follow these steps on the Ignition Gateway:
            </p>

            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-gray-200">Add Database Connection</strong>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Go to <strong>Config &rarr; Databases &rarr; Connections</strong> and click
                    <strong> Create new Database Connection</strong>. Select <strong>PostgreSQL</strong> as the driver.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-gray-200">Enter Connection Details</strong>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Use the JDBC URL and credentials from the panel on the right. Click <strong>Validate</strong> to test.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-gray-200">Create Alarm Journal Profile</strong>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Go to <strong>Config &rarr; Alarming &rarr; Journal</strong>. Create or edit a profile,
                    and select the new PostgreSQL connection as the data source.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">4</span>
                <div>
                  <strong className="text-gray-200">Trigger Alarms</strong>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Generate some test alarms in Ignition, then click <strong>"Check for Data"</strong> below
                    to verify events are flowing.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Database journal setup for {connectorType} connectors will be available in a future release.
          </p>
        )}
      </div>

      {/* Connection details + status */}
      <div className="space-y-6">
        {/* Connection details card */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">PostgreSQL Connection Details</h3>
          <div className="space-y-4">
            <CopyField
              label="JDBC URL"
              value="jdbc:postgresql://<YOUR_SIGNALFORGE_HOST>:5432/signalforge"
            />
            <div className="grid grid-cols-2 gap-4">
              <CopyField label="Username" value="signalforge" />
              <CopyField label="Password" value="signalforge_dev" />
            </div>
            <CopyField label="Database" value="signalforge" />
            <div className="rounded-md bg-yellow-900/20 border border-yellow-800/30 p-3">
              <p className="text-xs text-yellow-400/80">
                Replace <code className="text-yellow-300">&lt;YOUR_SIGNALFORGE_HOST&gt;</code> in the JDBC URL with the IP address
                or hostname of the machine running SignalForge. This must be reachable from your Ignition gateway.
              </p>
            </div>
          </div>
        </div>

        {/* Data check card */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Journal Data Status</h3>

          {journalStatus?.has_data ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {journalStatus.total} event{journalStatus.total !== 1 ? 's' : ''} found!
                </span>
              </div>

              {Object.keys(journalStatus.by_type).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(journalStatus.by_type).map(([type, count]) => (
                    <span key={type} className="badge badge-info">
                      {count} {type}
                    </span>
                  ))}
                </div>
              )}

              {journalStatus.earliest && journalStatus.latest && (
                <div className="text-xs text-gray-500">
                  {new Date(journalStatus.earliest).toLocaleString()} &mdash;{' '}
                  {new Date(journalStatus.latest).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-400">
                <XCircle className="h-5 w-5 text-gray-600" />
                <span className="text-sm">
                  {journalStatus?.error
                    ? `Error: ${journalStatus.error}`
                    : 'No alarm journal data yet'}
                </span>
              </div>
              {polling && (
                <p className="text-xs text-blue-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Auto-checking every 5 seconds...
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              className="btn-primary text-sm"
              onClick={() => polling ? stopPolling() : startPolling()}
            >
              {polling ? (
                <>Stop Checking</>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Check for Data
                </>
              )}
            </button>
            {!polling && (
              <button
                className="btn-secondary text-sm"
                onClick={checkJournal}
              >
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 3 — Test & Preview
   ═══════════════════════════════════════════════════════════════════════════ */

function Step3TestPreview({ connectorId, connectorType }: { connectorId: string; connectorType: string }) {
  const [testResult, setTestResult] = useState<ConnectorTestResult | null>(null)
  const [showPollData, setShowPollData] = useState(true)

  const testMutation = useMutation({
    mutationFn: () => connectorsApi.test(connectorId),
    onSuccess: ({ data }) => {
      setTestResult(data)
      setShowPollData(true)
    },
  })

  // Auto-test on mount
  useEffect(() => {
    testMutation.mutate()
  }, [connectorId])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          className="btn-primary text-sm"
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
        >
          <Zap className="h-4 w-4" />
          {testMutation.isPending ? 'Testing...' : 'Test & Fetch Events'}
        </button>
      </div>

      {testResult && (
        <div className="card overflow-hidden">
          {/* Result header */}
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
                <p className="text-xs text-gray-500 mt-0.5">Query time: {testResult.connection_ms}ms</p>
              )}
            </div>
            {showPollData
              ? <ChevronUp className="h-4 w-4 text-gray-500" />
              : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </div>

          {showPollData && (
            <div className="p-5">
              {testResult.note && (
                <p className="text-xs border rounded-md px-3 py-2 mb-5 text-blue-400/80 bg-blue-900/20 border-blue-800/30">
                  {testResult.note}
                </p>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Raw data */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Raw Journal Events
                    {testResult.sample_records && testResult.sample_records.length > 0 && (
                      <span className="ml-2 text-gray-600 normal-case font-normal">
                        {testResult.sample_records.length} event{testResult.sample_records.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h4>
                  {testResult.sample_records && testResult.sample_records.length > 0 ? (
                    <div className="max-h-[600px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                      {testResult.sample_records.map((record, i) => (
                        <div key={i} className="rounded-md border border-gray-700 bg-gray-900 p-3 text-xs font-mono">
                          <div className="text-[10px] text-gray-600 mb-1">#{i + 1}</div>
                          {Object.keys(record).map((field) => (
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
                    <p className="text-sm text-gray-500">No events found. Go back to Step 2 to configure the alarm journal.</p>
                  )}
                </div>

                {/* Canonical output */}
                <div className="relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                    <span className="text-[10px] text-gray-600 -rotate-90 whitespace-nowrap mt-1">transform</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Canonical Output
                      {testResult.normalized_preview && testResult.normalized_preview.length > 0 && (
                        <span className="ml-2 text-gray-600 normal-case font-normal">
                          {testResult.normalized_preview.length} event{testResult.normalized_preview.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </h4>
                    {testResult.normalized_preview && testResult.normalized_preview.length > 0 ? (
                      <div className="max-h-[600px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                        {testResult.normalized_preview.map((event, i) => (
                          <div key={i} className="rounded-md border border-blue-900/40 bg-gray-900 p-3 text-xs font-mono space-y-2">
                            <div className="text-[10px] text-gray-600">#{i + 1}</div>
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

      {!testResult && !testMutation.isPending && (
        <div className="card p-8 text-center text-gray-500">
          <Zap className="h-8 w-8 mx-auto mb-3 text-gray-600" />
          <p className="text-sm">Click "Test & Fetch Events" to preview alarm journal data</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 4 — Transform & Export
   ═══════════════════════════════════════════════════════════════════════════ */

function Step4Transform({ connectorId }: { connectorId: string }) {
  const navigate = useNavigate()

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Transform & Export Configuration</h3>
      <p className="text-sm text-gray-400 mb-6">
        Configure how raw alarm journal events are mapped to the canonical SignalForge schema,
        then enable export to start pushing data to Loki for analysis.
      </p>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Wrench className="h-5 w-5 text-blue-400" />
          <div>
            <div className="text-sm font-medium text-gray-200">Field Mapping & Export</div>
            <div className="text-xs text-gray-500">
              Map vendor-specific fields to the canonical alarm schema, preview the transformation,
              and enable Loki export when ready.
            </div>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate(`/alarms/transform?connector=${connectorId}`)}
        >
          <ExternalLink className="h-4 w-4" />
          Open Transform Page
        </button>
      </div>

      <div className="rounded-md bg-blue-900/20 border border-blue-800/30 p-3">
        <p className="text-xs text-blue-400/80">
          Once you've configured the field mappings and enabled export on the Transform page,
          the signal-service will automatically begin transforming alarm journal events and
          pushing them to Loki on each polling cycle.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared components
   ═══════════════════════════════════════════════════════════════════════════ */

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  )
}
