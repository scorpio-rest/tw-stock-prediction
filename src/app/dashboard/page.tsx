'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PredictionDisplay } from '@/components/prediction/PredictionDisplay'
import { SignalGrid } from '@/components/signals/SignalGrid'
import { SignalRadarChart } from '@/components/signals/SignalRadarChart'
import { AIReasoningCard } from '@/components/ai/AIReasoningCard'
import { StockChart } from '@/components/chart/StockChart'
import { HorizonSelector } from '@/components/chart/ChartToolbar'
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary'
import { AccuracyChart } from '@/components/statistics/AccuracyChart'
import { useStockStore } from '@/stores/useStockStore'
import { useStockQuote, useStockKlines } from '@/hooks/useStockData'
import { usePrediction, useAIAnalysis, usePredictionStats, useTriggerPrediction } from '@/hooks/usePrediction'
import { useSignals } from '@/hooks/useSignals'
import { useAccount } from '@/hooks/usePortfolio'
import { useStockWebSocket } from '@/hooks/useStockWebSocket'
import { parseDirection } from '@/lib/utils'
import { HORIZON_LABELS } from '@/lib/constants'
import type { Timeframe } from '@/types/stock'

export default function DashboardPage() {
  const { currentStock, prediction } = useStockStore()
  const [horizon, setHorizon] = useState<Timeframe>('1w')

  const { data: quote, isLoading: quoteLoading } = useStockQuote(currentStock)
  const { data: signals, isLoading: signalsLoading } = useSignals(currentStock)
  const { data: composite, isLoading: predictionLoading } = usePrediction(currentStock, horizon)
  const { data: klines, isLoading: klinesLoading } = useStockKlines(currentStock, '3mo')
  const { data: account, isLoading: accountLoading } = useAccount()
  const { data: stats, isLoading: statsLoading } = usePredictionStats()
  const { status: wsStatus } = useStockWebSocket(currentStock)

  // Frontend AI analysis
  const { data: aiResult, isLoading: aiLoading } = useAIAnalysis(composite)

  // Predict mutation
  const triggerPrediction = useTriggerPrediction(currentStock || '', horizon)
  const handlePredict = () => {
    if (currentStock) triggerPrediction.mutate()
  }

  const displayPrediction = prediction || composite

  // Use blended score from AI when available
  const totalScore = aiResult?.available
    ? aiResult.blendedScore
    : displayPrediction?.composite_score?.total_score ?? 0
  const direction = aiResult?.available
    ? aiResult.blendedDirection
    : displayPrediction?.composite_score?.direction || '中性'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">儀表板</h1>
        {currentStock && (
          <span className="text-sm text-muted-foreground">
            即時追蹤: <span className="font-mono font-medium">{currentStock}</span>
          </span>
        )}
      </div>

      {!currentStock ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground">請使用上方搜尋欄選擇股票</p>
            <p className="mt-1 text-sm text-muted-foreground">
              按 <kbd className="rounded border bg-muted px-1.5 text-xs font-mono">⌘K</kbd> 快速搜尋
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Horizon selector */}
          <div className="flex justify-end">
            <HorizonSelector horizon={horizon} onHorizonChange={setHorizon} />
          </div>

          {/* Prediction Display */}
          <PredictionDisplay
            direction={parseDirection(direction)}
            confidence={displayPrediction?.composite_score?.confidence ?? 0}
            totalScore={totalScore}
            stockCode={quote?.stock_id || currentStock}
            stockName={quote?.stock_name || ''}
            currentPrice={quote?.current_price ?? 0}
            changePct={quote?.change_percent ?? 0}
            isLoading={predictionLoading && quoteLoading}
            lastUpdated={displayPrediction?.composite_score?.calculated_at}
            horizonLabel={HORIZON_LABELS[horizon]}
            aiActive={aiResult?.available || displayPrediction?.ai_analysis?.available}
            onPredict={handlePredict}
            isPredicting={triggerPrediction.isPending}
            predictSuccess={triggerPrediction.isSuccess}
            predictHorizonLabel={HORIZON_LABELS[horizon]}
          />

          {/* Signals + AI */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SignalGrid signals={displayPrediction?.signals || []} isLoading={signalsLoading} />
            </div>
            <div className="space-y-6">
              {displayPrediction?.signals && displayPrediction.signals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">訊號雷達圖</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SignalRadarChart
                      signals={displayPrediction.signals}
                      direction={parseDirection(direction)}
                    />
                  </CardContent>
                </Card>
              )}
              <AIReasoningCard
                reasoning={aiResult?.reasoning || displayPrediction?.ai_analysis?.reasoning}
                isLoading={predictionLoading || aiLoading}
                timestamp={displayPrediction?.composite_score?.calculated_at}
                model={aiResult?.model || displayPrediction?.ai_analysis?.model}
                sources={aiResult?.sources || displayPrediction?.ai_analysis?.sources}
              />
            </div>
          </div>

          {/* Stock Chart */}
          <StockChart
            data={klines || []}
            isLoading={klinesLoading}
            stockName={quote ? `${quote.stock_id} ${quote.stock_name}` : undefined}
          />

          {/* Bottom row: Portfolio + Stats */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">模擬倉摘要</CardTitle>
              </CardHeader>
              <CardContent>
                <PortfolioSummary account={account || null} isLoading={accountLoading} />
              </CardContent>
            </Card>

            <AccuracyChart
              successRate={stats?.success_rate || 0}
              totalPredictions={stats?.total_predictions || 0}
              successCount={stats?.success_count || 0}
              isLoading={statsLoading}
            />
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground">
        本系統僅供學術研究與技術實驗使用，所有分析結果不構成投資建議。
      </p>
    </div>
  )
}
