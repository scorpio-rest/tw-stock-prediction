'use client'

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { cssVar } from '@/lib/chartColors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SIGNAL_NAMES } from '@/lib/constants'
import type { SignalAccuracyData } from '@/types/signal'

interface SignalAccuracyProps {
  data: SignalAccuracyData[]
  isLoading: boolean
}

export function SignalAccuracy({ data, isLoading }: SignalAccuracyProps) {
  const option = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.accuracy - a.accuracy)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const item = params[0]
          return `${item.name}: ${item.value.toFixed(1)}%`
        },
      },
      grid: { left: 120, right: 40, top: 10, bottom: 20 },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          color: cssVar('muted-foreground'),
        },
        splitLine: {
          lineStyle: { color: cssVar('border', 0.3) },
        },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((d) => SIGNAL_NAMES[d.signalName] || d.signalName),
        axisLabel: {
          color: cssVar('foreground'),
          fontSize: 12,
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((d) => ({
            value: d.accuracy,
            itemStyle: {
              color: d.accuracy >= 75 ? '#22c55e' : d.accuracy >= 60 ? '#eab308' : '#ef4444',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: cssVar('muted-foreground'),
            fontSize: 11,
          },
        },
      ],
    }
  }, [data])

  if (isLoading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">各訊號準確率</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts
          option={option}
          style={{ height: Math.max(200, data.length * 36) }}
          opts={{ renderer: 'canvas' }}
        />
      </CardContent>
    </Card>
  )
}
