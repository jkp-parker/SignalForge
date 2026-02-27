import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { metricsApi, healthApi } from '../lib/api'
import { AlarmRateChart } from '../components/charts/AlarmRateChart'
import { SeverityDonut } from '../components/charts/SeverityDonut'
import {
  AlertTriangle,
  Plug,
  Database,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Cpu,
  BarChart3,
} from 'lucide-react'

export default function Dashboard() {
  const { data: metrics, dataUpdatedAt } = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: () => metricsApi.overview().then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check().then((r) => r.data),
    refetchInterval: 15_000,
  })

  const cs = metrics?.connectors
  const totals = metrics?.totals ?? { last_1h: 0, last_24h: 0 }
  const alarmRate = metrics?.alarm_rate ?? []
  const bySeverity = metrics?.by_severity ?? []

  const scadaLines = [
    { label: 'Configured', value: String(cs?.total ?? '—'), cls: cs && cs.total === 0 ? 'text-red-400' : undefined },
    { label: 'Enabled', value: cs ? `${cs.enabled} / ${cs.total}` : '—', cls: cs?.enabled ? 'text-green-400' : 'text-red-400' },
    { label: 'Errors', value: cs ? String(cs.error) : '—', cls: cs?.error ? 'text-red-400' : 'text-gray-400' },
  ]

  const signalLines = [
    { label: 'Ingest status', value: cs?.connected ? 'Polling' : 'Idle', cls: cs?.connected ? 'text-green-400' : 'text-yellow-500' },
    { label: 'Export', value: cs ? (cs.export_enabled > 0 ? 'Enabled' : 'Disabled') : '—', cls: cs?.export_enabled ? 'text-green-400' : 'text-red-400' },
    { label: 'Poll interval', value: '30s' },
  ]

  const lokiLines = [
    { label: 'Status', value: health?.loki === 'connected' ? 'Connected' : 'Error', cls: health?.loki === 'connected' ? 'text-green-400' : 'text-red-400' },
    { label: 'Alarms (1h)', value: totals.last_1h.toLocaleString() },
    { label: 'Alarms (24h)', value: totals.last_24h.toLocaleString() },
  ]

  const journal = health?.journal
  const pgLines = [
    { label: 'Status', value: health?.database === 'connected' ? 'Connected' : 'Error', cls: health?.database === 'connected' ? 'text-green-400' : 'text-red-400' },
    { label: 'Journal queue', value: journal ? `${journal.events} event${journal.events !== 1 ? 's' : ''}` : '—' },
    { label: 'Table size', value: journal?.table_size ?? '—' },
  ]

  const grafanaLines = [
    { label: 'Status', value: health?.grafana === 'connected' ? 'Connected' : 'Error', cls: health?.grafana === 'connected' ? 'text-green-400' : 'text-red-400' },
    { label: 'Datasource', value: 'Loki (auto)' },
    { label: 'Dashboards', value: 'Provisioned' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">System pipeline overview and alarm analytics</p>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Auto-refresh 15s
          {dataUpdatedAt > 0 && (
            <span className="text-gray-600 ml-1">
              &middot; {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Pipeline flow ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Pipeline</p>

        {/* Main row: SCADA → Signal Service → Loki → Grafana */}
        <div className="flex items-stretch gap-1.5">
          {/* SCADA Sources */}
          <div className="flex-1 min-w-0">
            <PipelineStage
              icon={<Plug className="h-4 w-4 text-gray-500" />}
              title="SCADA Sources"
              status={cs ? (cs.total === 0 || cs.enabled === 0 ? 'error' : cs.connected > 0 ? 'ok' : cs.error > 0 ? 'error' : 'idle') : 'idle'}
              lines={scadaLines}
              footer={
                <Link to="/admin/connectors" className="text-xs text-blue-400 hover:text-blue-300">
                  Manage →
                </Link>
              }
            />
          </div>

          <PipelineArrow />

          {/* Signal Service */}
          <div className="flex-1 min-w-0">
            <PipelineStage
              icon={<Cpu className="h-4 w-4 text-gray-500" />}
              title="Signal Service"
              status={cs ? (cs.export_enabled > 0 ? 'ok' : 'error') : 'idle'}
              lines={signalLines}
            />
          </div>

          <PipelineArrow />

          {/* Loki */}
          <div className="flex-1 min-w-0">
            <PipelineStage
              icon={<Database className="h-4 w-4 text-gray-500" />}
              title="Loki"
              status={health?.loki === 'connected' ? 'ok' : health ? 'error' : 'idle'}
              lines={lokiLines}
            />
          </div>

          <PipelineArrow />

          {/* Grafana */}
          <div className="flex-1 min-w-0">
            <PipelineStage
              icon={<BarChart3 className="h-4 w-4 text-gray-500" />}
              title="Grafana"
              status={health?.grafana === 'connected' ? 'ok' : health ? 'error' : 'idle'}
              lines={grafanaLines}
              footer={
                <a
                  href="http://localhost:3001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              }
            />
          </div>
        </div>

        {/* Infrastructure row below */}
        <div className="flex gap-1.5 mt-1.5">
          {/* Spacer to align under SCADA+arrow */}
          <div className="flex-[2] flex gap-1.5 min-w-0">
            {/* PostgreSQL aligned under Signal Service */}
            <div className="flex-1 min-w-0">
              <PipelineStage
                icon={<Database className="h-4 w-4 text-gray-500" />}
                title="PostgreSQL"
                status={health?.database === 'connected' ? 'ok' : health ? 'error' : 'idle'}
                lines={pgLines}
                compact
              />
            </div>
            {/* Backend API */}
            <div className="flex-1 min-w-0">
              <PipelineStage
                icon={<Activity className="h-4 w-4 text-gray-500" />}
                title="Backend API"
                status={health?.status === 'healthy' ? 'ok' : health ? 'error' : 'idle'}
                lines={[
                  { label: 'Status', value: health?.status ?? '—', cls: health?.status === 'healthy' ? 'text-green-400' : 'text-red-400' },
                  { label: 'ISA-18.2', value: 'Phase 4', cls: 'text-gray-500' },
                ]}
                compact
              />
            </div>
          </div>
          {/* spacer matching arrow + loki + arrow + grafana */}
          <div className="flex-[2]" />
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-blue-400" />} label="Alarms (24h)" value={totals.last_24h.toLocaleString()} />
        <StatCard icon={<Clock className="h-4 w-4 text-purple-400" />} label="Alarms (1h)" value={totals.last_1h.toLocaleString()} />
        <StatCard
          icon={<Plug className="h-4 w-4 text-green-400" />}
          label="Active Connectors"
          value={cs ? `${cs.connected} / ${cs.total}` : '—'}
          subtext={cs?.error ? `${cs.error} in error` : undefined}
          subtextClass="text-red-400"
        />
        <StatCard
          icon={<Activity className="h-4 w-4 text-gray-400" />}
          label="System"
          value={health?.status ?? '...'}
          valueClass={health?.status === 'healthy' ? 'text-green-400' : health ? 'text-red-400' : 'text-gray-400'}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Alarm Ingest Rate — Last 24h (hourly)
          </h3>
          <AlarmRateChart data={alarmRate} />
        </div>
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            By Severity — 24h
          </h3>
          <SeverityDonut data={bySeverity} />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

type StageStatus = 'ok' | 'error' | 'idle'

function PipelineStage({
  icon,
  title,
  status,
  lines,
  footer,
  compact = false,
}: {
  icon: React.ReactNode
  title: string
  status: StageStatus
  lines: { label: string; value: string; cls?: string }[]
  footer?: React.ReactNode
  compact?: boolean
}) {
  const dotColor = { ok: 'bg-green-500', error: 'bg-red-500', idle: 'bg-gray-600' }[status]
  const borderAccent = { ok: 'border-green-800/40', error: 'border-red-800/40', idle: 'border-gray-700' }[status]

  return (
    <div className={`card p-3.5 flex flex-col gap-2.5 h-full border ${borderAccent}`}>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        {icon}
        <span className="text-xs font-semibold text-gray-200 truncate">{title}</span>
      </div>
      {!compact && (
        <div className="space-y-1.5">
          {lines.map((line, i) => (
            <div key={i} className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-500 truncate">{line.label}</span>
              <span className={`text-xs font-medium tabular-nums ${line.cls ?? 'text-gray-300'}`}>{line.value}</span>
            </div>
          ))}
        </div>
      )}
      {compact && (
        <div className="space-y-1">
          {lines.map((line, i) => (
            <div key={i} className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-500 truncate">{line.label}</span>
              <span className={`text-xs font-medium ${line.cls ?? 'text-gray-300'}`}>{line.value}</span>
            </div>
          ))}
        </div>
      )}
      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </div>
  )
}

function PipelineArrow() {
  return (
    <div className="flex items-center text-gray-700 shrink-0 self-center">
      <div className="h-px w-3 bg-gray-700" />
      <ArrowRight className="h-4 w-4 -ml-px" />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  valueClass,
  subtext,
  subtextClass,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
  subtext?: string
  subtextClass?: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueClass ?? 'text-gray-100'}`}>{value}</div>
      {subtext && <div className={`text-xs mt-1 ${subtextClass ?? 'text-gray-400'}`}>{subtext}</div>}
    </div>
  )
}
