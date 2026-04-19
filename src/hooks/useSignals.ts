'use client'

import { useQuery } from '@tanstack/react-query'
import { predictionService } from '@/services/predictionService'

export function useSignals(code: string | null) {
  return useQuery({
    queryKey: ['signals', code],
    queryFn: () => predictionService.getSignals(code!),
    enabled: !!code,
    staleTime: 30000,
    refetchInterval: 60000,
  })
}
