import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

interface DataPoint {
  time: number
  count: number
}

export function AlarmRateChart({ data }: { data: DataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const draw = () => {
      if (!svgRef.current || !containerRef.current) return

      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()

      const totalWidth = containerRef.current.clientWidth
      const totalHeight = containerRef.current.clientHeight
      const margin = { top: 12, right: 16, bottom: 28, left: 36 }
      const width = totalWidth - margin.left - margin.right
      const height = totalHeight - margin.top - margin.bottom

      if (width <= 0 || height <= 0) return

      svg.attr('width', totalWidth).attr('height', totalHeight)

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

      if (data.length === 0) {
        g.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#4b5563')
          .attr('font-size', '13px')
          .text('No alarm data — connect a SCADA source to see ingest rate')
        return
      }

      const x = d3
        .scaleTime()
        .domain(d3.extent(data, (d) => new Date(d.time * 1000)) as [Date, Date])
        .range([0, width])

      const yMax = d3.max(data, (d) => d.count) || 1
      const y = d3.scaleLinear().domain([0, yMax * 1.2]).range([height, 0])

      // Gradient
      const defs = svg.append('defs')
      const gradId = 'alarm-area-gradient'
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%')
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.35)
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.03)

      // Grid lines
      g.append('g')
        .call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(() => ''))
        .call((g) => {
          g.select('.domain').remove()
          g.selectAll('.tick line').attr('stroke', '#374151').attr('stroke-dasharray', '3,3')
          g.selectAll('.tick text').remove()
        })

      // Area fill
      const area = d3
        .area<DataPoint>()
        .x((d) => x(new Date(d.time * 1000)))
        .y0(height)
        .y1((d) => y(d.count))
        .curve(d3.curveMonotoneX)

      g.append('path').datum(data).attr('fill', `url(#${gradId})`).attr('d', area)

      // Line
      const line = d3
        .line<DataPoint>()
        .x((d) => x(new Date(d.time * 1000)))
        .y((d) => y(d.count))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .attr('d', line)

      // Data point dots
      g.selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', (d) => x(new Date(d.time * 1000)))
        .attr('cy', (d) => y(d.count))
        .attr('r', 3)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#1e40af')
        .attr('stroke-width', 1.5)

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat((d) => d3.timeFormat('%H:%M')(d as Date)),
        )
        .call((g) => {
          g.select('.domain').remove()
          g.selectAll('.tick line').remove()
          g.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '11px')
        })

      // Y axis
      g.append('g')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
        .call((g) => {
          g.select('.domain').remove()
          g.selectAll('.tick line').remove()
          g.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '11px')
        })
    }

    draw()
    const observer = new ResizeObserver(draw)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [data])

  return (
    <div ref={containerRef} className="w-full h-48">
      <svg ref={svgRef} />
    </div>
  )
}
