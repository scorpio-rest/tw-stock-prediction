'use client'

import { useQuery } from '@tanstack/react-query'
import { stockService } from '@/services/stockService'

export function useStockQuote(code: string | null) {
  return useQuery({
    queryKey: ['stockQuote', code],
    queryFn: () => stockService.getQuote(code!),
    enabled: !!code,
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useStockKlines(code: string | null, period: string = '3mo') {
  return useQuery({
    queryKey: ['klines', code, period],
    queryFn: () => stockService.getHistory(code!, period),
    enabled: !!code,
    staleTime: 60000,
  })
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stockSearch', query],
    queryFn: () => stockService.search(query),
    enabled: query.length >= 1,
    staleTime: 30000,
  })
}
