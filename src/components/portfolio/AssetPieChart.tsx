'use client'

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { cssVar } from '@/lib/chartColors'
import type { Holding } from '@/types/portfolio'

interface AssetPieChartProps {
  holdings: Holding[]
  cash: number
}

export function AssetPieChart({ holdings, cash }: AssetPieChartProps) {
  const option = useMemo(() => {
    const data = [
      ...holdings.map((h) => ({
        name: `${h.stock_id} ${h.stock_name}`,
        value: h.current_price * h.shares,
      })),
      { name: '現金', value: cash },
    ]

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: NT${c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: {
          color: cssVar('foreground'),
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: cssVar('background'),
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data,
        },
      ],
    }
  }, [holdings, cash])

  return (
    <ReactECharts
      option={option}
      style={{ height: 300 }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
