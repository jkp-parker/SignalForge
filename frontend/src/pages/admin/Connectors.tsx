import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { connectorsApi, type Connector, type ConnectorCreate } from '../../lib/api'
import {
  Plus, X, ChevronRight, ArrowLeft, Flame, Factory, Monitor, Cpu,
} from 'lucide-react'

const PLATFORMS = [
  {
    value: 'ignition',
    label: 'Ignition',
    vendor: 'Inductive Automation',
    description: 'SCADA platform with alarm journal database integration.',
    icon: Flame,
    available: true,
  },
  {
    value: 'factorytalk',
    label: 'FactoryTalk',
    vendor: 'Rockwell Automation',
    description: 'Industrial automation and information platform.',
    icon: Factory,
    available: false,
  },
  {
    value: 'wincc',
    label: 'WinCC',
    vendor: 'Siemens',
    description: 'SCADA visualization and control system.',
    icon: Monitor,
    available: false,
  },
  {
    value: 'plant_scada',
    label: 'Plant SCADA',
    vendor: 'AVEVA (Citect)',
    description: 'Process control and SCADA platform.',
    icon: Cpu,
    available: false,
  },
]

type Step = 'closed' | 'pick_platform' | 'name'

export default function Connectors() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('closed')
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => connectorsApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: ConnectorCreate) => connectorsApi.create(data),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      setStep('closed')
      setSelectedPlatform(null)
      // Navigate to the new connector's setup wizard
      navigate(`/admin/connectors/${data.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectorsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connectors'] }),
  })

  const platform = PLATFORMS.find((p) => p.value === selectedPlatform)

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedPlatform) return
    const form = new FormData(e.currentTarget)
    createMutation.mutate({
      name: form.get('name') as string,
      connector_type: selectedPlatform,
    })
  }

  const handleToggle = () => {
    if (step === 'closed') {
      setStep('pick_platform')
      setSelectedPlatform(null)
    } else {
      setStep('closed')
      setSelectedPlatform(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Connectors</h1>
          <p className="text-sm text-gray-400 mt-1">Manage SCADA data source connections</p>
        </div>
        <button
          className={step !== 'closed' ? 'btn-secondary' : 'btn-primary'}
          onClick={handleToggle}
        >
          {step !== 'closed'
            ? <><X className="h-4 w-4" />Cancel</>
            : <><Plus className="h-4 w-4" />Add Connector</>}
        </button>
      </div>

      {/* Step 1: Platform Picker */}
      {step === 'pick_platform' && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Select Platform</h3>
          <p className="text-xs text-gray-500 mb-5">Choose the SCADA system you want to connect to.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORMS.map((p) => {
              const Icon = p.icon
              return (
                <button
                  key={p.value}
                  disabled={!p.available}
                  onClick={() => {
                    setSelectedPlatform(p.value)
                    setStep('name')
                  }}
                  className={`relative flex flex-col items-center gap-3 rounded-lg border p-5 text-center transition-all ${
                    p.available
                      ? 'border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-gray-800 cursor-pointer'
                      : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {!p.available && (
                    <span className="absolute top-2 right-2 text-[10px] font-medium text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 border border-gray-700">
                      Coming Soon
                    </span>
                  )}
                  <div className={`rounded-lg p-3 ${p.available ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${p.available ? 'text-gray-100' : 'text-gray-500'}`}>
                      {p.label}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{p.vendor}</div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Just a name */}
      {step === 'name' && platform && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <button
              className="text-gray-500 hover:text-gray-300 transition-colors"
              onClick={() => setStep('pick_platform')}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="rounded-lg p-2 bg-blue-600/20 text-blue-400">
              <platform.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-200">New {platform.label} Connector</h3>
              <p className="text-xs text-gray-500">{platform.vendor}</p>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            <div className="max-w-md mb-4">
              <label className="label">Connector Name</label>
              <input
                name="name"
                className="input"
                required
                placeholder={`e.g. Plant A ${platform.label}`}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1.5">
                You'll configure connection details and alarm journal setup in the next steps.
              </p>
            </div>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create & Configure'}
            </button>
          </form>
        </div>
      )}

      {/* Connector List */}
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
                <th className="table-th">Status</th>
                <th className="table-th">Polling</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {connectors.map((c: Connector) => {
                const plat = PLATFORMS.find((p) => p.value === c.connector_type)
                const Icon = plat?.icon || Cpu
                return (
                  <tr key={c.id} className="hover:bg-gray-700/30">
                    <td className="table-td">
                      <button
                        onClick={() => navigate(`/admin/connectors/${c.id}`)}
                        className="flex items-center gap-2 font-medium text-blue-400 hover:text-blue-300"
                      >
                        <Icon className="h-4 w-4 text-gray-500" />
                        {c.name}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="table-td">
                      <span className="text-gray-300">{plat?.label || c.connector_type}</span>
                      <span className="text-[10px] text-gray-600 ml-1.5">{plat?.vendor}</span>
                    </td>
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
                )
              })}
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
