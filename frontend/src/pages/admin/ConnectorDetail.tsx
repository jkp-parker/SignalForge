import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectorsApi, type ConnectorCreate } from '../../lib/api'

const CONNECTOR_TYPES = [
  { value: 'ignition', label: 'Ignition' },
  { value: 'factorytalk', label: 'FactoryTalk' },
  { value: 'wincc', label: 'WinCC' },
  { value: 'plant_scada', label: 'Plant SCADA' },
]

export default function ConnectorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

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
    onSuccess: ({ data }) => setTestResult(data),
  })

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(id!),
    onSuccess: () => navigate('/admin/connectors'),
  })

  if (isLoading) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
  }

  if (!connector) {
    return <p style={{ color: 'var(--color-danger)' }}>Connector not found</p>
  }

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/admin/connectors')}>
          Back
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{connector.name}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {connector.connector_type} connector — {connector.host}:{connector.port}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Edit form */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Configuration</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Name
                </label>
                <input name="name" defaultValue={connector.name} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Type
                </label>
                <select name="connector_type" defaultValue={connector.connector_type}>
                  {CONNECTOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Host
                </label>
                <input name="host" defaultValue={connector.host} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Port
                </label>
                <input name="port" type="number" defaultValue={connector.port} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Polling Interval (seconds)
                </label>
                <input name="polling_interval" type="number" defaultValue={connector.polling_interval} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Description
                </label>
                <input name="description" defaultValue={connector.description} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={connector.enabled}
                  style={{ width: 'auto' }}
                />
                <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Enabled</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? 'Testing...' : 'Test Connection'}
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
                Delete
              </button>
            </div>
          </form>

          {testResult && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              backgroundColor: testResult.success ? '#166534' : '#991b1b',
              fontSize: '0.875rem',
            }}>
              {testResult.message}
            </div>
          )}

          {updateMutation.isSuccess && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              backgroundColor: '#166534',
              fontSize: '0.875rem',
            }}>
              Connector updated successfully
            </div>
          )}
        </div>

        {/* Status panel */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <StatusRow label="Status" value={connector.status} />
            <StatusRow label="Enabled" value={connector.enabled ? 'Yes' : 'No'} />
            <StatusRow
              label="Last Pull"
              value={connector.last_successful_pull
                ? new Date(connector.last_successful_pull).toLocaleString()
                : 'Never'}
            />
            {connector.error_message && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Error</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{connector.error_message}</div>
              </div>
            )}
            <StatusRow label="Created" value={new Date(connector.created_at).toLocaleString()} />
            <StatusRow label="Updated" value={new Date(connector.updated_at).toLocaleString()} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.125rem' }}>{label}</div>
      <div style={{ fontSize: '0.875rem' }}>{value}</div>
    </div>
  )
}
