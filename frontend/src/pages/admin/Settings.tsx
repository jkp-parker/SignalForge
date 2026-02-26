import { useQuery } from '@tanstack/react-query'
import { healthApi } from '../../lib/api'
import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react'

export default function Settings() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check().then((r) => r.data),
    refetchInterval: 30_000,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">System status and configuration</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="System Status"
          value={isLoading ? '...' : (health?.status || 'Unknown')}
          ok={health?.status === 'healthy'}
        />
        <StatCard
          label="Database"
          value={isLoading ? '...' : (health?.database || 'Unknown')}
          ok={health?.database === 'connected'}
        />
        <StatCard
          label="Loki"
          value={isLoading ? '...' : (health?.loki || 'Unknown')}
          ok={health?.loki === 'connected'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Services</h3>
          <div className="space-y-3">
            <ServiceRow label="PostgreSQL" status={health?.database ?? '—'} ok={health?.database === 'connected'} />
            <ServiceRow label="Loki" status={health?.loki ?? '—'} ok={health?.loki === 'connected'} />
            <ServiceRow label="Backend API" status={health?.status ?? '—'} ok={health?.status === 'healthy'} />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">About SignalForge</h3>
          <div className="divide-y divide-gray-700 text-sm">
            <InfoRow label="Version" value="0.1.0" />
            <InfoRow label="Architecture" value="FastAPI + React + Loki + Grafana" />
            <InfoRow label="ISA-18.2 Engine" value="Phase 4 — not yet active" muted />
            <div className="flex justify-between items-center py-2.5">
              <span className="text-gray-500">Grafana</span>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
              >
                Open Grafana
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const valueColor = ok === undefined ? 'text-gray-400' : ok ? 'text-green-400' : 'text-red-400'
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
    </div>
  )
}

function ServiceRow({ label, status, ok }: { label: string; status: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        {ok ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
        <span className={`text-sm ${ok ? 'text-green-400' : 'text-red-400'}`}>{status}</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-gray-500">{label}</span>
      <span className={muted ? 'text-gray-600' : 'text-gray-300'}>{value}</span>
    </div>
  )
}
