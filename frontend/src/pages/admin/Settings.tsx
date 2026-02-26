import { useQuery } from '@tanstack/react-query'
import { healthApi } from '../../lib/api'

export default function Settings() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check().then((r) => r.data),
    refetchInterval: 30_000,
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Settings</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          System status and configuration
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            System Status
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {isLoading ? '...' : (
              <span style={{ color: health?.status === 'healthy' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {health?.status || 'Unknown'}
              </span>
            )}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Database
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {isLoading ? '...' : (
              <span style={{ color: health?.database === 'connected' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {health?.database || 'Unknown'}
              </span>
            )}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Loki
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {isLoading ? '...' : (
              <span style={{ color: health?.loki === 'connected' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {health?.loki || 'Unknown'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>About SignalForge</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Version</span>
            <span>0.1.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Architecture</span>
            <span>FastAPI + React + Loki + Grafana</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>ISA-18.2 Engine</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Phase 4 — Not yet active</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Grafana</span>
            <span>
              <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                Open Grafana (port 3001)
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
