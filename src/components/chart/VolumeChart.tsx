'use client'

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { cssVar } from '@/lib/chartColors'
import type { Kline } from '@/types/stock'

interface VolumeChartProps {
  data: Kline[]
}

export function VolumeChart({ data }: VolumeChartProps) {
  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: data.map((k) => k.time),
      axisLine: { lineStyle: { color: cssVar('border') } },
      axisLabel: { color: cssVar('muted-foreground'), fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: cssVar('border') } },
      axisLabel: { color: cssVar('muted-foreground'), fontSize: 10 },
      splitLine: { lineStyle: { color: cssVar('border', 0.3) } },
    },
    series: [
      {
        type: 'bar',
        data: data.map((k) => ({
          value: k.volume,
          itemStyle: {
            color: k.close >= k.open ? '#ef4444' : '#22c55e',
          },
        })),
      },
    ],
    grid: { left: 50, right: 10, top: 10, bottom: 30 },
  }), [data])

  return (
    <ReactECharts
      option={option}
      style={{ height: 120 }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
