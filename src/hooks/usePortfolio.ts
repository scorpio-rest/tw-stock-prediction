'use client'

import { useMemo, useCallback } from 'react'
import { usePortfolioStore } from '@/stores/usePortfolioStore'
import type { TradeRequest } from '@/types/portfolio'

/**
 * All portfolio data is stored in browser localStorage.
 * These hooks wrap the store to provide a consistent API shape
 * matching what the components expect (data, isLoading, mutate, etc).
 */

export function useAccount() {
  const getAccount = usePortfolioStore((s) => s.getAccount)
  const currentCash = usePortfolioStore((s) => s.currentCash)
  const initialCapital = usePortfolioStore((s) => s.initialCapital)
  const holdings = usePortfolioStore((s) => s.holdings)

  const data = useMemo(
    () => getAccount(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCash, initialCapital, holdings]
  )

  return { data, isLoading: false }
}

export function usePositions() {
  const getPositions = usePortfolioStore((s) => s.getPositions)
  const holdings = usePortfolioStore((s) => s.holdings)

  const data = useMemo(
    () => getPositions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holdings]
  )

  return { data, isLoading: false }
}

export function useBuy() {
  const buy = usePortfolioStore((s) => s.buy)

  const mutate = useCallback(
    (data: TradeRequest & { stock_name?: string }, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => {
      try {
        buy({ ...data, stock_name: data.stock_name || data.stock_id })
        opts?.onSuccess?.()
      } catch (e) {
        opts?.onError?.(e instanceof Error ? e : new Error('交易失敗'))
      }
    },
    [buy]
  )

  return { mutate, isPending: false }
}

export function useSell() {
  const sell = usePortfolioStore((s) => s.sell)

  const mutate = useCallback(
    (data: TradeRequest & { stock_name?: string }, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => {
      try {
        sell({ ...data, stock_name: data.stock_name || data.stock_id })
        opts?.onSuccess?.()
      } catch (e) {
        opts?.onError?.(e instanceof Error ? e : new Error('交易失敗'))
      }
    },
    [sell]
  )

  return { mutate, isPending: false }
}

export function useTrades(params?: {
  page?: string
  page_size?: string
  stock_id?: string
  trade_type?: string
}) {
  const getTrades = usePortfolioStore((s) => s.getTrades)
  const trades = usePortfolioStore((s) => s.trades)

  const data = useMemo(
    () =>
      getTrades({
        page: params?.page ? parseInt(params.page, 10) : 1,
        pageSize: params?.page_size ? parseInt(params.page_size, 10) : 20,
        trade_type: params?.trade_type,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trades, params?.page, params?.page_size, params?.trade_type]
  )

  return { data, isLoading: false }
}

export function useResetPortfolio() {
  const reset = usePortfolioStore((s) => s.reset)

  const mutate = useCallback(
    (newCapital?: number) => {
      reset(newCapital)
    },
    [reset]
  )

  return { mutate, isPending: false }
}
