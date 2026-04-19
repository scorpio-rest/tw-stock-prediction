import { api } from './api'
import type { PredictionResult, PredictionRecord } from '@/types/prediction'
import type { CompositeScore, SignalScore } from '@/types/signal'
import type { PaginatedResult } from '@/types/api'

export const predictionService = {
  getComposite: (code: string, horizon: string = '1w') =>
    api.get<CompositeScore>(`/analysis/${code}/composite`, { horizon }),

  getSignals: (code: string) =>
    api.get<SignalScore[]>(`/analysis/${code}/signals`),

  getAIStatus: () =>
    api.get<{ enabled: boolean; reason: string; consecutive_failures: number; model: string; provider: string }>('/analysis/ai/status'),

  predict: (code: string, horizon: string = '1w') =>
    api.post<PredictionResult>(`/analysis/${code}/predict?horizon=${horizon}`),

  toggleAI: (enabled: boolean) =>
    api.post<{ enabled: boolean }>('/analysis/ai/toggle', { enabled }),

  getAISettings: () =>
    api.get<{ api_key: string; model: string; provider: string }>('/analysis/ai/settings'),

  updateAISettings: (settings: { api_key?: string; model?: string }) =>
    api.put<{ api_key: string; model: string; provider: string }>('/analysis/ai/settings', settings),

  getLatest: (code?: string) =>
    api.get<PredictionResult>('/predictions/latest', code ? { stock_id: code } : undefined),

  getStats: () =>
    api.get<{
      total_predictions: number
      success_count: number
      fail_count: number
      flat_count: number
      success_rate: number
      by_direction: any
      by_confidence: any
      by_period: any
      rolling_20: number | null
      rolling_50: number | null
      rolling_100: number | null
    }>('/predictions/stats'),

  getHistory: (params?: {
    page?: string
    pageSize?: string
    stockCode?: string
    direction?: string
  }) =>
    api.get<PaginatedResult<PredictionRecord>>('/predictions/history', params),
}
