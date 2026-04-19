'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { predictionService } from '@/services/predictionService'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { analyzeStock } from '@/services/geminiService'
import { buildAnalysisPrompt } from '@/lib/prompts'
import { blendScores, inferAiScoreFromText } from '@/lib/aiBlending'
import type { CompositeScore } from '@/types/signal'

export function useAIStatus() {
  const { geminiApiKey, aiEnabled } = useSettingsStore()
  const hasKey = geminiApiKey.trim().length > 0

  return {
    data: {
      enabled: hasKey && aiEnabled,
      reason: !hasKey ? '尚未設定 API Key，請至設定頁面配置' : '',
      model: useSettingsStore.getState().geminiModel,
      provider: 'google',
    },
  }
}

export function usePrediction(code: string | null, horizon: string = '1w') {
  return useQuery({
    queryKey: ['prediction', code, horizon],
    queryFn: () => predictionService.getComposite(code!, horizon),
    enabled: !!code,
    staleTime: 10000,
  })
}

export function useAIAnalysis(composite: CompositeScore | undefined | null) {
  const { geminiApiKey, geminiModel, aiEnabled } = useSettingsStore()
  const hasKey = geminiApiKey.trim().length > 0
  const enabled = hasKey && aiEnabled && !!composite

  return useQuery({
    queryKey: [
      'aiAnalysis',
      composite?.stock_id,
      composite?.horizon,
      composite?.composite_score?.total_score,
      geminiModel,
    ],
    queryFn: async () => {
      if (!composite) throw new Error('No composite data')

      const prompt = buildAnalysisPrompt({
        stockCode: composite.stock_id,
        stockName: composite.stock_name,
        currentPrice: composite.current_price,
        changePct: composite.change_pct,
        signals: composite.signals,
        weightedTotalScore: composite.composite_score.total_score,
        direction: composite.composite_score.direction,
        confidence: composite.composite_score.confidence,
        signalAgreement: composite.composite_score.signal_agreement,
        horizonLabel: composite.horizon_label || '1週',
        news: composite.news,
        fundamentals: composite.fundamentals,
      })

      const result = await analyzeStock({
        apiKey: geminiApiKey,
        model: geminiModel,
        prompt,
      })

      // If no score from AI, try to infer from text
      let aiScore = result.aiScore
      if (aiScore === null && result.reasoning) {
        aiScore = inferAiScoreFromText(result.reasoning)
      }

      const signalScore = composite.composite_score.signal_score ?? composite.composite_score.total_score
      const blended = blendScores(signalScore, aiScore, composite.signals)

      return {
        available: true,
        reasoning: result.reasoning,
        aiScore,
        model: geminiModel,
        blendedScore: blended.blendedScore,
        blendedDirection: blended.direction,
        aiWeight: blended.aiWeight,
        sources: {
          signals: true,
          fundamentals: !!composite.fundamentals,
          news_count: composite.news?.length || 0,
        },
      }
    },
    enabled,
    staleTime: 300000, // 5 minutes
    retry: 1,
  })
}

export function useTriggerPrediction(code: string, horizon: string = '1w') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => predictionService.predict(code, horizon),
    onSuccess: (data) => {
      queryClient.setQueryData(['prediction', code], data)
      // Invalidate stats and history so they refresh on next visit
      queryClient.invalidateQueries({ queryKey: ['predictionStats'] })
      queryClient.invalidateQueries({ queryKey: ['predictionHistory'] })
    },
  })
}

export function usePredictionStats() {
  return useQuery({
    queryKey: ['predictionStats'],
    queryFn: () => predictionService.getStats(),
    staleTime: 30000,
  })
}

export function usePredictionHistory(params?: {
  page?: string
  pageSize?: string
  stockCode?: string
  direction?: string
}) {
  return useQuery({
    queryKey: ['predictionHistory', params],
    queryFn: () => predictionService.getHistory(params),
    staleTime: 30000,
  })
}
