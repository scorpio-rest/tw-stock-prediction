'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, StarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PredictionDisplay } from '@/components/prediction/PredictionDisplay'
import { SignalGrid } from '@/components/signals/SignalGrid'
import { SignalRadarChart } from '@/components/signals/SignalRadarChart'
import { AIReasoningCard } from '@/components/ai/AIReasoningCard'
import { StockChart } from '@/components/chart/StockChart'
import { HorizonSelector } from '@/components/chart/ChartToolbar'
import { FundamentalsCard } from '@/components/stock/FundamentalsCard'
import { NewsCard } from '@/components/stock/NewsCard'
import { TradePanel } from '@/components/portfolio/TradePanel'
import { useStockStore } from '@/stores/useStockStore'
import { useUIStore } from '@/stores/useUIStore'
import { useStockQuote, useStockKlines } from '@/hooks/useStockData'
import { usePrediction, useAIAnalysis, useTriggerPrediction } from '@/hooks/usePrediction'
import { useSignals } from '@/hooks/useSignals'
import { useAccount, usePositions } from '@/hooks/usePortfolio'
import { useStockWebSocket } from '@/hooks/useStockWebSocket'
import { formatPrice, formatPercent, formatChange } from '@/lib/formatters'
import { cn, parseDirection } from '@/lib/utils'
import { HORIZON_LABELS } from '@/lib/constants'
import type { Timeframe } from '@/types/stock'

export default function StockPageClient() {
  const params = useParams()
  const paramCode = params.code as string
  const [code, setCode] = useState(paramCode)
  const [horizon, setHorizon] = useState<Timeframe>('1w')

  // Static export fix: Netlify rewrites may serve a pre-rendered stock page,
  // causing useParams() to return the wrong code. Read from URL directly.
  useEffect(() => {
    const match = window.location.pathname.match(/\/stock\/([^/]+)/)
    if (match && match[1] !== code) {
      setCode(match[1])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { setCurrentStock, prediction } = useStockStore()
  const { favoriteStocks, addFavorite, removeFavorite } = useUIStore()

  const { data: quote, isLoading: quoteLoading } = useStockQuote(code)
  const { data: signals, isLoading: signalsLoading } = useSignals(code)
  const { data: composite, isLoading: predictionLoading } = usePrediction(code, horizon)
  const { data: klines, isLoading: klinesLoading } = useStockKlines(code, '3mo')
  const { data: account } = useAccount()
  const { data: positions } = usePositions()
  const { status: wsStatus } = useStockWebSocket(code)

  // Frontend AI analysis
  const { data: aiResult, isLoading: aiLoading } = useAIAnalysis(composite)

  // Predict mutation
  const triggerPrediction = useTriggerPrediction(code, horizon)
  const handlePredict = () => triggerPrediction.mutate()

  useEffect(() => {
    setCurrentStock(code)
  }, [code, setCurrentStock])

  const displayPrediction = prediction || composite
  const isFavorite = favoriteStocks.includes(code)
  const currentPosition = positions?.find((p) => p.stock_id === code)

  // Use blended score from AI when available
  const hasAiScore = aiResult?.available && aiResult?.aiScore != null
  const totalScore = hasAiScore
    ? aiResult.blendedScore
    : displayPrediction?.composite_score?.total_score ?? 0
  const direction = hasAiScore
    ? aiResult.blendedDirection
    : displayPrediction?.composite_score?.direction || '中性'
  const baseConfidence = displayPrediction?.composite_score?.confidence ?? 0
  // When AI agrees with signals direction, boost confidence; when disagrees, lower it
  const confidence = hasAiScore
    ? (() => {
        const signalDir = displayPrediction?.composite_score?.direction || '中性'
        const aiDir = aiResult.blendedDirection
        if (signalDir === aiDir) return Math.min(100, baseConfidence + 10)
        if (signalDir !== '中性' && aiDir !== '中性' && signalDir !== aiDir) return Math.max(10, baseConfidence - 15)
        return baseConfidence
      })()
    : baseConfidence

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                <span className="font-mono">{code}</span>
                {quote && <span className="ml-2">{quote.stock_name}</span>}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => (isFavorite ? removeFavorite(code) : addFavorite(code))}
              >
                {isFavorite ? (
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
            </div>
            {quote && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono font-semibold">NT${formatPrice(quote.current_price)}</span>
                <span
                  className={cn(
                    'font-mono',
                    quote.change_percent > 0 ? 'text-stock-up' : quote.change_percent < 0 ? 'text-stock-down' : 'text-muted-foreground'
                  )}
                >
                  {formatChange(quote.change)} ({formatPercent(quote.change_percent)})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizon selector */}
      <div className="flex justify-end">
        <HorizonSelector horizon={horizon} onHorizonChange={setHorizon} />
      </div>

      {/* Prediction + AI */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PredictionDisplay
            direction={parseDirection(direction)}
            confidence={confidence}
            totalScore={totalScore}
            stockCode={code}
            stockName={quote?.stock_name || ''}
            currentPrice={quote?.current_price ?? 0}
            changePct={quote?.change_percent ?? 0}
            isLoading={predictionLoading && quoteLoading}
            lastUpdated={displayPrediction?.composite_score?.calculated_at}
            horizonLabel={HORIZON_LABELS[horizon]}
            aiActive={aiResult?.available || displayPrediction?.ai_analysis?.available}
            aiScore={aiResult?.aiScore}
            signalScore={displayPrediction?.composite_score?.total_score}
            aiWeight={aiResult?.aiWeight}
            onPredict={handlePredict}
            isPredicting={triggerPrediction.isPending}
            predictSuccess={triggerPrediction.isSuccess}
            predictHorizonLabel={HORIZON_LABELS[horizon]}
          />
        </div>
        <AIReasoningCard
          reasoning={aiResult?.reasoning || displayPrediction?.ai_analysis?.reasoning}
          isLoading={predictionLoading || aiLoading}
          timestamp={displayPrediction?.composite_score?.calculated_at}
          model={aiResult?.model || displayPrediction?.ai_analysis?.model}
          sources={aiResult?.sources || displayPrediction?.ai_analysis?.sources}
        />
      </div>

      {/* Fundamentals + News */}
      <div className="grid gap-6 lg:grid-cols-3">
        <FundamentalsCard data={composite?.fundamentals} />
        <div className="lg:col-span-2">
          <NewsCard items={composite?.news} />
        </div>
      </div>

      {/* Chart */}
      <StockChart
        data={klines || []}
        isLoading={klinesLoading}
        stockName={quote ? `${quote.stock_id} ${quote.stock_name}` : undefined}
      />

      {/* Signals Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">15大訊號分析</h2>
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <SignalGrid signals={displayPrediction?.signals || []} isLoading={signalsLoading} />
          </div>
          {displayPrediction?.signals && displayPrediction.signals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">訊號雷達圖</CardTitle>
              </CardHeader>
              <CardContent>
                <SignalRadarChart
                  signals={displayPrediction.signals}
                  direction={parseDirection(direction)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Trade Panel */}
      {quote && account && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2" />
          <TradePanel
            stockCode={code}
            stockName={quote.stock_name}
            currentPrice={quote.current_price}
            cash={account.current_cash}
            maxSellShares={currentPosition?.shares || 0}
          />
        </div>
      )}
    </div>
  )
}
