import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectorsApi, transformApi, type FieldMapping, type CanonicalEvent } from '../lib/api'
import { ArrowRight, Save, RotateCcw, CheckCircle2, AlertCircle, ChevronDown, Filter, X, Power, PowerOff } from 'lucide-react'

// ---------------------------------------------------------------------------
// Canonical target fields definition
// ---------------------------------------------------------------------------

const CANONICAL_FIELDS: { key: keyof FieldMapping; label: string; group: string; required?: boolean }[] = [
  { key: 'timestamp_field', label: 'Timestamp', group: 'Core', required: true },
  { key: 'message_field', label: 'Message / Description', group: 'Core', required: true },
  { key: 'severity_field', label: 'Severity', group: 'Labels', required: true },
  { key: 'area_field', label: 'Area / Zone', group: 'Labels' },
  { key: 'equipment_field', label: 'Equipment / Tag', group: 'Labels' },
  { key: 'alarm_type_field', label: 'Alarm Type', group: 'Labels' },
  { key: 'state_field', label: 'Alarm State', group: 'Metadata' },
  { key: 'value_field', label: 'Process Value', group: 'Metadata' },
  { key: 'threshold_field', label: 'Threshold / Limit', group: 'Metadata' },
  { key: 'priority_field', label: 'Priority', group: 'Metadata' },
  { key: 'vendor_id_field', label: 'Vendor Alarm ID', group: 'Metadata' },
]

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  warning: 'text-yellow-400',
  info: 'text-purple-400',
  error: 'text-red-400',
  fault: 'text-red-400',
  urgent: 'text-orange-400',
}

// ---------------------------------------------------------------------------
// Client-side transform preview
// ---------------------------------------------------------------------------

function applyMapping(rawRecords: Record<string, unknown>[], mapping: FieldMapping): CanonicalEvent[] {
  function severityToIsa(sev: string): string {
    const s = sev.toLowerCase()
    if (['critical', 'high', 'fault', 'error'].includes(s)) return 'high'
    if (['warning', 'medium', 'urgent'].includes(s)) return 'medium'
    return 'low'
  }

  return rawRecords.map((raw) => {
    const get = (key: keyof FieldMapping): unknown => {
      const field = mapping[key]
      return field ? raw[field] : undefined
    }
    const severity = String(get('severity_field') ?? 'info').toLowerCase()
    return {
      timestamp: String(get('timestamp_field') ?? ''),
      message: String(get('message_field') ?? ''),
      labels: {
        severity,
        area: String(get('area_field') ?? 'unknown'),
        equipment: String(get('equipment_field') ?? 'unknown'),
        alarm_type: String(get('alarm_type_field') ?? 'generic'),
        isa_priority: severityToIsa(severity),
        source: 'connector',
        connector_id: 'configured',
      },
      metadata: {
        state: String(get('state_field') ?? 'ACTIVE'),
        value: get('value_field') ?? null,
        threshold: get('threshold_field') ?? null,
        priority: get('priority_field') ?? null,
        vendor_alarm_id: String(get('vendor_id_field') ?? ''),
        ack_required: true,
        shelved: false,
      },
    }
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AlarmTransform() {
  const queryClient = useQueryClient()
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('')
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [exportEnabled, setExportEnabled] = useState(false)

  const { data: connectors = [] } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => connectorsApi.list().then((r) => r.data),
  })

  // Auto-select first connector
  useEffect(() => {
    if (connectors.length > 0 && !selectedConnectorId) {
      setSelectedConnectorId(connectors[0].id)
    }
  }, [connectors, selectedConnectorId])

  const { data: config, isLoading } = useQuery({
    queryKey: ['transform', selectedConnectorId],
    queryFn: () => transformApi.getConfig(selectedConnectorId).then((r) => r.data),
    enabled: !!selectedConnectorId,
  })

  // Sync mapping + export state from server when config loads
  useEffect(() => {
    if (config?.mapping) {
      setMapping(config.mapping)
      setIsDirty(false)
    }
    if (config) {
      setExportEnabled(config.export_enabled ?? false)
    }
  }, [config])

  // Reset filters when connector changes
  useEffect(() => {
    setFilters({})
  }, [selectedConnectorId])

  const saveMutation = useMutation({
    mutationFn: () => transformApi.save(selectedConnectorId, mapping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transform', selectedConnectorId] })
      setIsDirty(false)
      setSavedAt(new Date())
    },
  })

  const toggleExportMutation = useMutation({
    mutationFn: (enabled: boolean) => transformApi.toggleExport(selectedConnectorId, enabled),
    onSuccess: (_data, enabled) => {
      setExportEnabled(enabled)
      queryClient.invalidateQueries({ queryKey: ['transform', selectedConnectorId] })
    },
  })

  const handleMappingChange = (key: keyof FieldMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value || undefined }))
    setIsDirty(true)
    setSavedAt(null)
  }

  const handleReset = () => {
    if (config?.mapping) {
      setMapping(config.mapping)
      setIsDirty(false)
    }
  }

  const rawFields = config?.available_fields ?? []
  const rawData = config?.sample_raw ?? []

  // Build unique values per field for filter dropdowns
  const fieldValues = useMemo(() => {
    const vals: Record<string, string[]> = {}
    for (const field of rawFields) {
      const unique = [...new Set(rawData.map((r) => String(r[field] ?? '')))]
      unique.sort()
      vals[field] = unique
    }
    return vals
  }, [rawFields, rawData])

  // Apply filters to raw data
  const filteredRawData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v !== '')
    if (activeFilters.length === 0) return rawData
    return rawData.filter((row) =>
      activeFilters.every(([field, value]) => String(row[field] ?? '') === value),
    )
  }, [rawData, filters])

  // Live preview — computed client-side from filtered data
  const preview = useMemo(() => {
    if (!filteredRawData.length) return []
    return applyMapping(filteredRawData, mapping)
  }, [filteredRawData, mapping])

  const groups = [...new Set(CANONICAL_FIELDS.map((f) => f.group))]
  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Alarm Transformation</h1>
          <p className="text-sm text-gray-400 mt-1">
            Map vendor-specific SCADA fields to the canonical schema before ingestion into Loki
          </p>
        </div>

        {/* Connector selector + export toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Connector:</label>
            <div className="relative">
              <select
                className="input pr-8 appearance-none"
                value={selectedConnectorId}
                onChange={(e) => {
                  setSelectedConnectorId(e.target.value)
                  setIsDirty(false)
                }}
              >
                {connectors.length === 0 && <option value="">No connectors configured</option>}
                {connectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.connector_type})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {selectedConnectorId && (
            <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  exportEnabled ? 'bg-green-600' : 'bg-gray-600'
                }`}
                disabled={toggleExportMutation.isPending}
                onClick={() => toggleExportMutation.mutate(!exportEnabled)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    exportEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium flex items-center gap-1.5 ${
                exportEnabled ? 'text-green-400' : 'text-gray-500'
              }`}>
                {exportEnabled ? (
                  <>
                    <Power className="h-3.5 w-3.5" />
                    Exporting to Loki
                  </>
                ) : (
                  <>
                    <PowerOff className="h-3.5 w-3.5" />
                    Export disabled
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {!selectedConnectorId ? (
        <div className="card p-8 text-center">
          <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No connector selected. Add a connector first.</p>
        </div>
      ) : isLoading ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">Loading transform configuration...</p>
        </div>
      ) : (
        <>
          {/* ── Row 1: Raw Data Table ── */}
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">
                  Raw Vendor Data — {config?.connector_type ?? ''}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sample records as received from the SCADA system, before any transformation
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    onClick={() => setFilters({})}
                  >
                    <X className="h-3 w-3" />
                    Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                  </button>
                )}
                <span className="badge badge-gray">
                  {filteredRawData.length}{filteredRawData.length !== rawData.length ? ` / ${rawData.length}` : ''} records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-gray-800">
                    {/* Filter row */}
                    <tr className="border-b border-gray-600">
                      {rawFields.map((field) => (
                        <th key={`filter-${field}`} className="px-4 py-1.5">
                          <div className="relative">
                            <select
                              className="w-full text-[10px] py-1 pl-1.5 pr-5 rounded border border-gray-700 bg-gray-900 text-gray-400 appearance-none focus:outline-none focus:border-blue-600 truncate"
                              value={filters[field] ?? ''}
                              onChange={(e) =>
                                setFilters((prev) => ({ ...prev, [field]: e.target.value }))
                              }
                            >
                              <option value="">All</option>
                              {(fieldValues[field] ?? []).map((v) => (
                                <option key={v} value={v}>
                                  {v.length > 30 ? v.slice(0, 30) + '...' : v}
                                </option>
                              ))}
                            </select>
                            <Filter className={`absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none ${
                              filters[field] ? 'text-amber-400' : 'text-gray-600'
                            }`} />
                          </div>
                        </th>
                      ))}
                    </tr>
                    {/* Header row */}
                    <tr className="border-b border-gray-700">
                      {rawFields.map((field) => {
                        const isMapped = Object.values(mapping).includes(field)
                        const mappedTo = CANONICAL_FIELDS.find(
                          (cf) => mapping[cf.key] === field,
                        )
                        return (
                          <th
                            key={field}
                            className={`table-th py-2 text-xs whitespace-nowrap ${isMapped ? 'text-blue-400' : ''}`}
                          >
                            {field}
                            {isMapped && (
                              <div className="text-[10px] font-normal text-blue-500/70 normal-case tracking-normal mt-0.5">
                                &rarr; {mappedTo?.label}
                              </div>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredRawData.map((row, ri) => (
                      <tr key={ri} className="hover:bg-gray-700/20">
                        {rawFields.map((field) => {
                          const isMapped = Object.values(mapping).includes(field)
                          const val = row[field]
                          return (
                            <td
                              key={field}
                              className={`table-td py-2 font-mono max-w-[180px] truncate ${
                                isMapped ? 'text-blue-300' : 'text-gray-400'
                              }`}
                              title={String(val ?? '')}
                            >
                              {val === null || val === undefined
                                ? <span className="text-gray-600 italic">null</span>
                                : typeof val === 'boolean'
                                ? <span className={val ? 'text-green-400' : 'text-red-400'}>{String(val)}</span>
                                : String(val)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {filteredRawData.length === 0 && (
                      <tr>
                        <td colSpan={rawFields.length} className="text-center py-6 text-sm text-gray-500">
                          No records match the current filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Row 2: Mapping Editor + Canonical Preview ── */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            {/* Mapping editor — 2 cols */}
            <div className="col-span-2 card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-200">Field Mapping</h3>
                <div className="flex items-center gap-2">
                  {savedAt && !isDirty && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  )}
                  {isDirty && (
                    <button
                      className="btn-secondary text-xs py-1 px-2"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                  <button
                    className="btn-primary text-xs py-1 px-3"
                    disabled={!isDirty || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {group}
                    </p>
                    <div className="space-y-2">
                      {CANONICAL_FIELDS.filter((f) => f.group === group).map((cf) => (
                        <div key={cf.key} className="flex items-center gap-2">
                          <div className="w-36 shrink-0">
                            <span className="text-xs text-gray-300">
                              {cf.label}
                              {cf.required && <span className="text-red-400 ml-0.5">*</span>}
                            </span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-gray-600 shrink-0" />
                          <div className="relative flex-1">
                            <select
                              className="input text-xs py-1.5 pr-7 appearance-none"
                              value={mapping[cf.key] ?? ''}
                              onChange={(e) => handleMappingChange(cf.key, e.target.value)}
                            >
                              <option value="">— not mapped —</option>
                              {rawFields.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canonical preview — 3 cols */}
            <div className="col-span-3 card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-200">
                  Canonical Output Preview
                  {preview.length > 0 && (
                    <span className="ml-2 text-gray-600 font-normal">
                      {preview.length} alarm{preview.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                <span className="text-xs text-gray-500">
                  Live — updates as you configure mappings
                </span>
              </div>

              {preview.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                  {activeFilterCount > 0
                    ? 'No records match the current filters'
                    : 'Configure mappings on the left to see the output'}
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin">
                  {preview.map((event, i) => (
                    <CanonicalCard key={i} event={event} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Row 3: Schema reference ── */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Canonical Schema Reference</h3>
            <p className="text-xs text-gray-500 mb-3">
              Every alarm is stored in Loki with these labels as stream selectors and this metadata structure.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <p className="text-gray-500 mb-1.5">Labels (Loki stream selectors)</p>
                <div className="bg-gray-900 rounded-md p-3 space-y-1 border border-gray-700">
                  {[
                    ['source', 'connector name'],
                    ['severity', 'critical | high | medium | low | info'],
                    ['area', 'zone or plant area'],
                    ['equipment', 'tag path or device ID'],
                    ['alarm_type', 'alarm class or name'],
                    ['isa_priority', 'high | medium | low (auto-derived)'],
                    ['connector_id', 'internal connector UUID'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-blue-400 w-28 shrink-0">{k}</span>
                      <span className="text-gray-500">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1.5">Metadata (stored in log line JSON)</p>
                <div className="bg-gray-900 rounded-md p-3 space-y-1 border border-gray-700">
                  {[
                    ['state', 'ACTIVE | CLEAR | ACK'],
                    ['value', 'current process value (float)'],
                    ['threshold', 'alarm setpoint (float)'],
                    ['priority', 'vendor priority value'],
                    ['vendor_alarm_id', 'original alarm ID from SCADA'],
                    ['ack_required', 'boolean'],
                    ['shelved', 'boolean'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-purple-400 w-28 shrink-0">{k}</span>
                      <span className="text-gray-500">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Canonical event card
// ---------------------------------------------------------------------------

function CanonicalCard({ event, index }: { event: CanonicalEvent; index: number }) {
  const sevColor = SEVERITY_COLORS[event.labels.severity] ?? 'text-gray-300'

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-xs font-mono space-y-2.5">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-600">#{index + 1}</span>
        <span className="text-gray-500">timestamp:</span>
        <span className="text-cyan-400">{event.timestamp || <em className="text-gray-600">unmapped</em>}</span>
        <span className="text-gray-500 ml-auto">message:</span>
        <span className="text-gray-200 max-w-xs truncate" title={event.message}>
          {event.message || <em className="text-gray-600">unmapped</em>}
        </span>
      </div>

      {/* Labels */}
      <div>
        <span className="text-gray-600 mr-2">labels:</span>
        <span className="inline-flex flex-wrap gap-1.5">
          <LabelPill k="severity" v={event.labels.severity} valueClass={sevColor} />
          <LabelPill k="isa_priority" v={event.labels.isa_priority} />
          <LabelPill k="area" v={event.labels.area} />
          <LabelPill k="equipment" v={event.labels.equipment} />
          <LabelPill k="alarm_type" v={event.labels.alarm_type} />
        </span>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
        {(
          [
            ['state', event.metadata.state],
            ['value', event.metadata.value],
            ['threshold', event.metadata.threshold],
            ['priority', event.metadata.priority],
            ['vendor_id', event.metadata.vendor_alarm_id],
          ] as [string, unknown][]
        ).map(([k, v]) => (
          <span key={k}>
            <span className="text-gray-600">{k}: </span>
            <span className={v !== null && v !== undefined && v !== '' ? 'text-gray-300' : 'text-gray-700'}>
              {v !== null && v !== undefined && v !== '' ? String(v) : 'null'}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function LabelPill({ k, v, valueClass }: { k: string; v: string; valueClass?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-gray-800 border border-gray-700">
      <span className="text-gray-500">{k}=</span>
      <span className={valueClass ?? 'text-gray-300'}>&quot;{v}&quot;</span>
    </span>
  )
}
