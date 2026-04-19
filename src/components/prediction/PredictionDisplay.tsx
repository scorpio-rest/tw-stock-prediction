'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Info, Target, Loader2, CheckCircle2, Brain, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfidenceRing } from './ConfidenceRing'
import { Skeleton } from '@/components/ui/skeleton'
import { DIRECTION_COLORS } from '@/lib/constants'
import { formatPrice, formatPercent, formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Direction } from '@/types/prediction'

interface PredictionDisplayProps {
  direction: Direction
  confidence: number
  totalScore: number
  stockCode: string
  stockName: string
  currentPrice: number
  changePct: number
  isLoading: boolean
  lastUpdated?: string
  horizonLabel?: string
  aiActive?: boolean
  aiScore?: number | null
  signalScore?: number
  aiWeight?: number
  onPredict?: () => void
  isPredicting?: boolean
  predictSuccess?: boolean
  predictHorizonLabel?: string
}

export function PredictionDisplay({
  direction,
  confidence,
  totalScore,
  stockCode,
  stockName,
  currentPrice,
  changePct,
  isLoading,
  lastUpdated,
  horizonLabel,
  aiActive,
  aiScore,
  signalScore,
  aiWeight,
  onPredict,
  isPredicting,
  predictSuccess,
  predictHorizonLabel,
}: PredictionDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-6 w-64" />
        </CardContent>
      </Card>
    )
  }

  const colors = DIRECTION_COLORS[direction]

  // Convert total_score (-100~100) to bullish/bearish percentages
  const bullishPct = Math.round(Math.min(100, Math.max(0, (totalScore + 100) / 2)))
  const bearishPct = 100 - bullishPct

  return (
    <Card className={cn('overflow-hidden border-2 transition-colors', colors.border)}>
      <CardContent className={cn('flex flex-col items-center gap-4 p-6 md:p-8', colors.bg)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${direction}-${confidence}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center gap-4"
          >
            <ConfidenceRing value={confidence} direction={direction} />

            {horizonLabel && (
              <div className={cn('-mt-1 text-xs font-medium uppercase tracking-wide', colors.text)}>
                未來 {horizonLabel} 預測
              </div>
            )}

            {/* Bullish / Bearish dual percentage display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
              className="flex w-full max-w-xs flex-col gap-3"
            >
              {/* Bullish row */}
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 shrink-0 text-stock-up md:h-8 md:w-8" />
                <div className="flex flex-1 items-center gap-2">
                  <span className="w-12 text-lg font-bold text-stock-up md:text-xl">看漲</span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-stock-up"
                      initial={{ width: 0 }}
                      animate={{ width: `${bullishPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-lg font-bold text-stock-up md:text-xl">
                    {bullishPct}%
                  </span>
                </div>
              </div>
              {/* Bearish row */}
              <div className="flex items-center gap-3">
                <TrendingDown className="h-6 w-6 shrink-0 text-stock-down md:h-8 md:w-8" />
                <div className="flex flex-1 items-center gap-2">
                  <span className="w-12 text-lg font-bold text-stock-down md:text-xl">看跌</span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-stock-down"
                      initial={{ width: 0 }}
                      animate={{ width: `${bearishPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-lg font-bold text-stock-down md:text-xl">
                    {bearishPct}%
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-base">
            <span className="font-mono font-medium">{stockCode}</span>
            <span>{stockName}</span>
            <span className="mx-1 text-muted-foreground">|</span>
            <span className="font-mono font-semibold">NT${formatPrice(currentPrice)}</span>
            <span className={cn('font-mono', changePct > 0 ? 'text-stock-up' : changePct < 0 ? 'text-stock-down' : 'text-stock-flat')}>
              {formatPercent(changePct)}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              最後更新：{formatDateTime(lastUpdated)}
            </span>
          )}
          {aiActive === false && (
            <span className="mt-1 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <Info className="h-3 w-3" />
              僅依據 15 大訊號加權計算，AI 未參與評分
            </span>
          )}
          {aiActive && aiScore != null && aiWeight != null && (
            <div className="mt-2 flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-xs">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">訊號</span>
                <span className="font-mono font-semibold">{signalScore ?? 0}</span>
              </div>
              <span className="text-muted-foreground">+</span>
              <div className="flex items-center gap-1">
                <Brain className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-muted-foreground">AI</span>
                <span className="font-mono font-semibold">{aiScore}</span>
                <span className="text-muted-foreground">({Math.round(aiWeight * 100)}%)</span>
              </div>
              <span className="text-muted-foreground">=</span>
              <span className="font-mono font-bold">{totalScore}</span>
            </div>
          )}
        </div>

        {/* Predict button */}
        {onPredict && (
          <Button
            onClick={onPredict}
            disabled={isPredicting || predictSuccess}
            className={cn(
              'mt-2 gap-2',
              predictSuccess
                ? 'bg-green-600 hover:bg-green-600 text-white'
                : ''
            )}
            size="lg"
          >
            {isPredicting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                建立預測中...
              </>
            ) : predictSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                預測已建立 — {predictHorizonLabel || '1週'}後驗證
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                建立預測紀錄
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
