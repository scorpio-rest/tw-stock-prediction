export type Direction = 'bullish' | 'bearish' | 'neutral'

export type DirectionLabel = '強烈看漲' | '看漲' | '微幅看漲' | '中性' | '微幅看跌' | '看跌' | '強烈看跌'

export interface PredictionResult {
  stockCode: string
  stockName: string
  timestamp: string
  currentPrice: number
  changePct: number
  weightedTotalScore: number
  direction: Direction
  directionLabel: DirectionLabel
  confidence: number
  signalAgreement: string
  aiReasoning?: string
}

export interface PredictionRecord {
  id: string
  date: string
  stockCode: string
  stockName: string
  predictedDirection: Direction
  confidence: number
  priceAtPrediction: number
  priceAtVerify?: number
  actualChange?: number
  isCorrect?: boolean
  status: 'pending' | 'verified' | 'expired'
  horizon?: string
  horizonLabel?: string
  verifyAfter?: string
}

export interface VerificationResult {
  analysisTimestamp: string
  verifyTimestamp: string
  predictedDirection: Direction
  priceAtPrediction: number
  priceAtVerify: number
  changePct: number
  result: 'success' | 'fail' | 'flat'
}
