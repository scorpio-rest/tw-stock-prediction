'use client'

import { motion } from 'framer-motion'
import {
  BarChart3, Scale, ArrowUpDown, TrendingUp, Zap,
  Activity, LineChart, GitBranch, Gauge,
  Users, BarChart, Globe, Waves, AlertTriangle, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SignalMiniBar } from './SignalMiniBar'
import { DIRECTION_COLORS, SIGNAL_NAMES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SignalScore } from '@/types/signal'

const iconMap: Record<string, React.ElementType> = {
  outer_ratio: BarChart3,
  bid_ask_pressure: Scale,
  tick_direction: ArrowUpDown,
  intraday_position: TrendingUp,
  momentum: Zap,
  rsi: Activity,
  macd: LineChart,
  kd: GitBranch,
  acceleration: Gauge,
  institutional_flow: Users,
  volume_price: BarChart,
  market_correlation: Globe,
  moving_average: Waves,
  volatility: AlertTriangle,
  time_factor: Clock,
}

interface SignalCardProps {
  signal: SignalScore
}

export function SignalCard({ signal }: SignalCardProps) {
  // Map signal name to key for icon lookup
  const signalKey = Object.entries(SIGNAL_NAMES).find(([_, name]) => name === signal.name)?.[0] || ''
  const Icon = iconMap[signalKey] || Activity

  // Derive direction from score
  const direction = signal.score > 10 ? 'bullish' : signal.score < -10 ? 'bearish' : 'neutral'
  const colors = DIRECTION_COLORS[direction]
  const normalizedScore = (signal.score + 100) / 2 // Convert -100~100 to 0~100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {signal.name}
          </CardTitle>
          <Icon className={cn('h-4 w-4', colors.text)} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <motion.span
              key={signal.score}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn('text-2xl font-bold font-mono', colors.text)}
            >
              {(signal.score ?? 0) > 0 ? '+' : ''}{(signal.score ?? 0).toFixed(0)}
            </motion.span>
            <span className="text-xs text-muted-foreground">
              權重 {((signal.weight ?? 0) * 100).toFixed(0)}%
            </span>
          </div>

          <Progress
            value={normalizedScore}
            className="h-2"
            indicatorClassName={cn(
              direction === 'bullish' && 'bg-stock-up',
              direction === 'bearish' && 'bg-stock-down',
              direction === 'neutral' && 'bg-stock-flat',
            )}
          />

          <p className="text-xs text-muted-foreground line-clamp-2">
            {signal.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
