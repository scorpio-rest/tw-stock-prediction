'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cssVar } from '@/lib/chartColors'
import type { Kline } from '@/types/stock'

interface StockChartProps {
  data: Kline[]
  isLoading: boolean
  stockName?: string
}

export function StockChart({ data, isLoading, stockName }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: cssVar('foreground'),
      },
      grid: {
        vertLines: { color: cssVar('border', 0.5) },
        horzLines: { color: cssVar('border', 0.5) },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: cssVar('border'),
      },
      rightPriceScale: {
        borderColor: cssVar('border'),
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#22c55e',
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
      borderUpColor: '#ef4444',
      borderDownColor: '#22c55e',
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart
    seriesRef.current = candleSeries
    volumeRef.current = volumeSeries

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || !data.length) return

    const candleData = data.map((k) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }))

    const volumeData = data.map((k) => ({
      time: k.time,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)',
    }))

    seriesRef.current.setData(candleData)
    volumeRef.current.setData(volumeData)
    chartRef.current?.timeScale().fitContent()
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{stockName || '走勢圖'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{stockName || '走勢圖'}</CardTitle>
        <span className="text-xs text-muted-foreground">日K · 近 3 個月</span>
      </CardHeader>
      <CardContent className="p-0 pb-4 px-2">
        <div ref={chartContainerRef} className="w-full" />
      </CardContent>
    </Card>
  )
}
