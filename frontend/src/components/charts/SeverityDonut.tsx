import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

interface SeveritySlice {
  severity: string
  count: number
}

const COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#8b5cf6',
  unknown: '#6b7280',
}

const ORDER = ['critical', 'high', 'medium', 'low', 'info', 'unknown']

export function SeverityDonut({ data }: { data: SeveritySlice[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sorted = [...data].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity))

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const size = 160
    const radius = size / 2 - 6
    const innerRadius = radius * 0.62

    svg.attr('width', size).attr('height', size)

    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`)

    if (sorted.length === 0) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#4b5563')
        .attr('font-size', '12px')
        .text('No data yet')
      return
    }

    const total = d3.sum(sorted, (d) => d.count)

    const pie = d3.pie<SeveritySlice>().value((d) => d.count).sort(null)
    const arc = d3
      .arc<d3.PieArcDatum<SeveritySlice>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .padAngle(0.025)
      .cornerRadius(2)

    g.selectAll('path')
      .data(pie(sorted))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => COLORS[d.data.severity] || COLORS.unknown)

    // Center total
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('font-size', '22px')
      .attr('font-weight', '700')
      .attr('fill', '#f3f4f6')
      .text(total.toLocaleString())

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text('alarms 24h')
  }, [sorted])

  return (
    <div className="flex items-center gap-5">
      <svg ref={svgRef} className="shrink-0" />
      <div className="space-y-2 min-w-0">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-500">No severity data</p>
        ) : (
          sorted.map((d) => (
            <div key={d.severity} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[d.severity] || COLORS.unknown }}
              />
              <span className="text-gray-400 capitalize w-16">{d.severity}</span>
              <span className="text-gray-200 font-medium tabular-nums">{d.count.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
