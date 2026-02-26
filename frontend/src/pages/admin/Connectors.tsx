import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { connectorsApi, type Connector, type ConnectorCreate } from '../../lib/api'

const CONNECTOR_TYPES = [
  { value: 'ignition', label: 'Ignition' },
  { value: 'factorytalk', label: 'FactoryTalk' },
  { value: 'wincc', label: 'WinCC' },
  { value: 'plant_scada', label: 'Plant SCADA' },
]

export default function Connectors() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => connectorsApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: ConnectorCreate) => connectorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectorsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connectors'] }),
  })

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    createMutation.mutate({
      name: form.get('name') as string,
      connector_type: form.get('connector_type') as string,
      description: form.get('description') as string,
      host: form.get('host') as string,
      port: parseInt(form.get('port') as string) || 8088,
      polling_interval: parseInt(form.get('polling_interval') as string) || 30,
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Connectors</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Manage SCADA data source connections
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Connector'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>New Connector</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Name
                </label>
                <input name="name" required placeholder="e.g. Plant A Ignition" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Type
                </label>
                <select name="connector_type" required>
                  {CONNECTOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Host
                </label>
                <input name="host" required placeholder="e.g. 192.168.1.100" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Port
                </label>
                <input name="port" type="number" defaultValue={8088} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Polling Interval (seconds)
                </label>
                <input name="polling_interval" type="number" defaultValue={30} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>
                  Description
                </label>
                <input name="description" placeholder="Optional description" />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Connector'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading connectors...</p>
        ) : connectors.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem' }}>
            No connectors configured. Click "Add Connector" to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Host</th>
                <th>Status</th>
                <th>Polling</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c: Connector) => (
                <tr key={c.id}>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/connectors/${c.id}`)}
                      style={{ background: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: 500 }}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td>{CONNECTOR_TYPES.find((t) => t.value === c.connector_type)?.label || c.connector_type}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{c.host}:{c.port}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.polling_interval}s</td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => {
                        if (confirm(`Delete connector "${c.name}"?`)) {
                          deleteMutation.mutate(c.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connected: 'badge-success',
    polling: 'badge-success',
    error: 'badge-danger',
    disconnected: 'badge-warning',
  }
  return <span className={`badge ${styles[status] || 'badge-info'}`}>{status}</span>
}
