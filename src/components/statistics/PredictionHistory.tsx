'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PredictionBadge } from '@/components/prediction/PredictionBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatPrice, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { PredictionRecord } from '@/types/prediction'

interface PredictionHistoryProps {
  records: PredictionRecord[]
  isLoading: boolean
}

export function PredictionHistory({ records, isLoading }: PredictionHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">暫無預測記錄</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日期</TableHead>
          <TableHead>股票</TableHead>
          <TableHead>預測</TableHead>
          <TableHead>區間</TableHead>
          <TableHead className="text-right">信心值</TableHead>
          <TableHead className="text-right">預測價</TableHead>
          <TableHead className="text-right">實際漲跌</TableHead>
          <TableHead className="text-center">結果</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs text-muted-foreground">
              {formatDate(r.date)}
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">{r.stockCode}</span>
              <span className="ml-1 text-xs text-muted-foreground">{r.stockName}</span>
            </TableCell>
            <TableCell>
              <PredictionBadge direction={r.predictedDirection} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {r.horizonLabel || r.horizon || '-'}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {r.confidence}%
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {formatPrice(r.priceAtPrediction)}
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-mono text-sm',
                r.actualChange && r.actualChange > 0 ? 'text-stock-up' : r.actualChange && r.actualChange < 0 ? 'text-stock-down' : ''
              )}
            >
              {r.actualChange !== undefined ? formatPercent(r.actualChange) : '-'}
            </TableCell>
            <TableCell className="text-center">
              {r.status === 'pending' ? (
                <Badge variant="secondary">等待中</Badge>
              ) : r.isCorrect ? (
                <Badge variant="success">正確</Badge>
              ) : (
                <Badge variant="destructive">錯誤</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
