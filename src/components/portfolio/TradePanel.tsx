'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useBuy, useSell } from '@/hooks/usePortfolio'
import { formatCurrency, calculateFee, calculateTax } from '@/lib/formatters'

interface TradePanelProps {
  stockCode: string
  stockName: string
  currentPrice: number
  cash: number
  maxSellShares?: number
  initialTab?: 'buy' | 'sell'
  onSuccess?: () => void
  hideBuyTab?: boolean
  borderless?: boolean
}

export function TradePanel({
  stockCode,
  stockName,
  currentPrice,
  cash,
  maxSellShares = 0,
  initialTab = 'buy',
  onSuccess,
  hideBuyTab = false,
  borderless = false,
}: TradePanelProps) {
  const [lots, setLots] = useState(1)
  const [tab, setTab] = useState<'buy' | 'sell'>(initialTab)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const buyMutation = useBuy()
  const sellMutation = useSell()

  const shares = lots * 1000
  const amount = currentPrice * shares
  const fee = calculateFee(amount)
  const tax = tab === 'sell' ? calculateTax(amount) : 0
  const totalCost = tab === 'buy' ? amount + fee : amount - fee - tax

  const canBuy = totalCost <= cash && currentPrice > 0
  const canSell = shares > 0 && shares <= maxSellShares && currentPrice > 0

  const handleTrade = () => {
    setErrorMsg(null)
    const data = { stock_id: stockCode, stock_name: stockName, shares, price: currentPrice }
    const opts = {
      onSuccess: () => {
        onSuccess?.()
      },
      onError: (err: Error) => {
        setErrorMsg(err.message || '交易失敗，請稍後再試')
      },
    }
    if (tab === 'buy') {
      buyMutation.mutate(data, opts)
    } else {
      sellMutation.mutate(data, opts)
    }
  }

  const isPending = buyMutation.isPending || sellMutation.isPending

  const inner = (
    <Tabs value={tab} onValueChange={(v: string) => setTab(v as 'buy' | 'sell')}>
          {!hideBuyTab && (
            <TabsList className="w-full">
              <TabsTrigger value="buy" className="flex-1 data-[state=active]:text-stock-up">
                買入
              </TabsTrigger>
              <TabsTrigger value="sell" className="flex-1 data-[state=active]:text-stock-down">
                賣出
              </TabsTrigger>
            </TabsList>
          )}

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">股票</span>
              <span className="font-mono font-medium">{stockCode} {stockName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">現價</span>
              <span className="font-mono font-medium">NT$ {currentPrice.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">數量（張）</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLots(Math.max(1, lots - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={tab === 'sell' ? Math.floor(maxSellShares / 1000) || 1 : undefined}
                  value={lots}
                  onChange={(e) => {
                    const next = Math.max(1, parseInt(e.target.value) || 1)
                    const cap = tab === 'sell' ? Math.floor(maxSellShares / 1000) || 1 : next
                    setLots(Math.min(next, cap))
                  }}
                  className="h-8 text-center font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const cap = tab === 'sell' ? Math.floor(maxSellShares / 1000) || 1 : lots + 1
                    setLots(Math.min(lots + 1, cap))
                  }}
                >
                  +
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">成交金額</span>
                <span className="font-mono">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">手續費 (0.1425% x 6折)</span>
                <span className="font-mono">{formatCurrency(fee)}</span>
              </div>
              {tab === 'sell' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">證交稅 (0.3%)</span>
                  <span className="font-mono">{formatCurrency(tax)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>{tab === 'buy' ? '總計' : '淨收入'}</span>
                <span className="font-mono">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {tab === 'buy'
                ? `可用餘額：${formatCurrency(cash)}`
                : `可賣數量：${(maxSellShares / 1000).toFixed(0)} 張`}
            </div>

            {errorMsg && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <Button
              className="w-full"
              variant={tab === 'buy' ? 'bullish' : 'bearish'}
              size="lg"
              disabled={isPending || (tab === 'buy' ? !canBuy : !canSell)}
              onClick={handleTrade}
            >
              {isPending ? '處理中...' : tab === 'buy' ? `確認買入 ${lots} 張` : `確認賣出 ${lots} 張`}
            </Button>
          </div>
        </Tabs>
  )

  if (borderless) {
    return inner
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">交易面板</CardTitle>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  )
}
