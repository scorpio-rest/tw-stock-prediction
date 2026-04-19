'use client'

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { cssVar } from '@/lib/chartColors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DataPoint {
  date: string
  value: number
}

interface TrendLineChartProps {
  data: DataPoint[]
  title: string
  color?: string
}

export function TrendLineChart({ data, title, color = '#3b82f6' }: TrendLineChartProps) {
  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ name: string; value: number }>) => {
          const item = params[0]
          return `${item.name}: ${item.value.toFixed(1)}%`
        },
      },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date),
        axisLabel: {
          color: cssVar('muted-foreground'),
          fontSize: 10,
        },
        axisLine: { lineStyle: { color: cssVar('border') } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
          color: cssVar('muted-foreground'),
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: cssVar('border', 0.3) } },
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.value),
          smooth: true,
          showSymbol: false,
          lineStyle: { color, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${color}40` },
                { offset: 1, color: `${color}05` },
              ],
            },
          },
        },
        {
          type: 'line',
          data: data.map(() => 50),
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
          showSymbol: false,
          tooltip: { show: false },
        },
      ],
    }),
    [data, color]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 250 }} opts={{ renderer: 'canvas' }} />
      </CardContent>
    </Card>
  )
}
