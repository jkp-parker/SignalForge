import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { connectorsApi, type Connector, type ConnectorCreate } from '../../lib/api'
import { Plus, X, ChevronRight } from 'lucide-react'

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Connectors</h1>
          <p className="text-sm text-gray-400 mt-1">Manage SCADA data source connections</p>
        </div>
        <button
          className={showForm ? 'btn-secondary' : 'btn-primary'}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <><X className="h-4 w-4" />Cancel</> : <><Plus className="h-4 w-4" />Add Connector</>}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">New Connector</h3>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Name</label>
                <input name="name" className="input" required placeholder="e.g. Plant A Ignition" />
              </div>
              <div>
                <label className="label">Type</label>
                <select name="connector_type" className="input" required>
                  {CONNECTOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Host</label>
                <input name="host" className="input" required placeholder="e.g. 192.168.1.100" />
              </div>
              <div>
                <label className="label">Port</label>
                <input name="port" type="number" className="input" defaultValue={8088} />
              </div>
              <div>
                <label className="label">Polling Interval (seconds)</label>
                <input name="polling_interval" type="number" className="input" defaultValue={30} />
              </div>
              <div>
                <label className="label">Description</label>
                <input name="description" className="input" placeholder="Optional description" />
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
          <p className="text-sm text-gray-500 text-center py-8">Loading connectors...</p>
        ) : connectors.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No connectors configured. Click "Add Connector" to get started.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="table-th">Name</th>
                <th className="table-th">Type</th>
                <th className="table-th">Host</th>
                <th className="table-th">Status</th>
                <th className="table-th">Polling</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {connectors.map((c: Connector) => (
                <tr key={c.id} className="hover:bg-gray-700/30">
                  <td className="table-td">
                    <button
                      onClick={() => navigate(`/admin/connectors/${c.id}`)}
                      className="flex items-center gap-1 font-medium text-blue-400 hover:text-blue-300"
                    >
                      {c.name}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="table-td">
                    {CONNECTOR_TYPES.find((t) => t.value === c.connector_type)?.label || c.connector_type}
                  </td>
                  <td className="table-td font-mono text-xs text-gray-400">{c.host}:{c.port}</td>
                  <td className="table-td">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="table-td">{c.polling_interval}s</td>
                  <td className="table-td">
                    <button
                      className="btn-danger text-xs py-1 px-2"
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
  const cls: Record<string, string> = {
    connected: 'badge-success',
    polling: 'badge-success',
    error: 'badge-danger',
    disconnected: 'badge-warning',
  }
  return <span className={`badge ${cls[status] || 'badge-info'}`}>{status}</span>
}
