'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { INITIAL_CAPITAL, FEE_RATE, FEE_DISCOUNT, MIN_FEE, TAX_RATE } from '@/lib/constants'
import type { Holding, Trade, Account, TradeRequest } from '@/types/portfolio'

interface PortfolioState {
  initialCapital: number
  currentCash: number
  /** Internal holdings: stock_id → { shares, avg_cost, stock_name } */
  holdings: Record<string, { shares: number; avg_cost: number; stock_name: string }>
  trades: Trade[]
}

interface PortfolioActions {
  buy: (req: TradeRequest & { stock_name: string }) => Trade
  sell: (req: TradeRequest & { stock_name: string }) => Trade
  reset: (newCapital?: number) => void
  getAccount: (priceMap?: Record<string, number>) => Account
  getPositions: (priceMap?: Record<string, number>) => Holding[]
  getTrades: (params?: { page?: number; pageSize?: number; trade_type?: string }) => Trade[]
}

type PortfolioStore = PortfolioState & PortfolioActions

function calcFee(amount: number): number {
  return Math.max(MIN_FEE, Math.round(amount * FEE_RATE * FEE_DISCOUNT))
}

function calcTax(amount: number): number {
  return Math.round(amount * TAX_RATE)
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      initialCapital: INITIAL_CAPITAL,
      currentCash: INITIAL_CAPITAL,
      holdings: {},
      trades: [],

      buy: (req) => {
        const { stock_id, stock_name, shares, price } = req
        const amount = price * shares
        const fee = calcFee(amount)
        const totalCost = amount + fee
        const state = get()

        if (totalCost > state.currentCash) {
          throw new Error('餘額不足')
        }

        const trade: Trade = {
          id: makeId(),
          stock_id,
          stock_name,
          trade_type: 'buy',
          shares,
          price,
          amount,
          fee,
          tax: 0,
          net_amount: totalCost,
          traded_at: new Date().toISOString(),
        }

        const prev = state.holdings[stock_id]
        const newShares = (prev?.shares || 0) + shares
        const prevCost = (prev?.shares || 0) * (prev?.avg_cost || 0)
        const newAvgCost = (prevCost + amount) / newShares

        set({
          currentCash: state.currentCash - totalCost,
          holdings: {
            ...state.holdings,
            [stock_id]: { shares: newShares, avg_cost: newAvgCost, stock_name },
          },
          trades: [trade, ...state.trades],
        })

        return trade
      },

      sell: (req) => {
        const { stock_id, stock_name, shares, price } = req
        const state = get()
        const holding = state.holdings[stock_id]

        if (!holding || holding.shares < shares) {
          throw new Error('持倉不足')
        }

        const amount = price * shares
        const fee = calcFee(amount)
        const tax = calcTax(amount)
        const netIncome = amount - fee - tax
        const costBasis = holding.avg_cost * shares
        const realizedPnl = Math.round((amount - costBasis - fee - tax) * 100) / 100

        const trade: Trade = {
          id: makeId(),
          stock_id,
          stock_name,
          trade_type: 'sell',
          shares,
          price,
          amount,
          fee,
          tax,
          net_amount: netIncome,
          realized_pnl: realizedPnl,
          traded_at: new Date().toISOString(),
        }

        const remainShares = holding.shares - shares
        const newHoldings = { ...state.holdings }
        if (remainShares <= 0) {
          delete newHoldings[stock_id]
        } else {
          newHoldings[stock_id] = { ...holding, shares: remainShares }
        }

        set({
          currentCash: state.currentCash + netIncome,
          holdings: newHoldings,
          trades: [trade, ...state.trades],
        })

        return trade
      },

      reset: (newCapital) => {
        const capital = newCapital || get().initialCapital
        set({
          initialCapital: capital,
          currentCash: capital,
          holdings: {},
          trades: [],
        })
      },

      getAccount: (priceMap) => {
        const state = get()
        const pm = priceMap || {}
        let totalStockValue = 0
        let positionsCount = 0

        for (const [stockId, h] of Object.entries(state.holdings)) {
          const price = pm[stockId] || h.avg_cost
          totalStockValue += price * h.shares
          positionsCount++
        }

        const totalAssets = state.currentCash + totalStockValue
        const totalPnl = totalAssets - state.initialCapital
        const totalPnlPct = state.initialCapital > 0
          ? (totalPnl / state.initialCapital) * 100
          : 0

        return {
          username: 'local',
          initial_capital: state.initialCapital,
          current_cash: state.currentCash,
          total_stock_value: Math.round(totalStockValue),
          total_assets: Math.round(totalAssets),
          total_pnl: Math.round(totalPnl),
          total_pnl_pct: Math.round(totalPnlPct * 100) / 100,
          positions_count: positionsCount,
        }
      },

      getPositions: (priceMap) => {
        const state = get()
        const pm = priceMap || {}

        return Object.entries(state.holdings).map(([stockId, h]) => {
          const currentPrice = pm[stockId] || h.avg_cost
          const totalCost = h.avg_cost * h.shares
          const currentValue = currentPrice * h.shares
          const unrealizedPnl = currentValue - totalCost
          const unrealizedPnlPct = totalCost > 0
            ? (unrealizedPnl / totalCost) * 100
            : 0

          return {
            stock_id: stockId,
            stock_name: h.stock_name,
            shares: h.shares,
            avg_cost: Math.round(h.avg_cost * 100) / 100,
            current_price: currentPrice,
            total_cost: Math.round(totalCost),
            unrealized_pnl: Math.round(unrealizedPnl),
            unrealized_pnl_pct: Math.round(unrealizedPnlPct * 100) / 100,
          }
        })
      },

      getTrades: (params) => {
        const state = get()
        let filtered = state.trades
        if (params?.trade_type) {
          filtered = filtered.filter((t) => t.trade_type === params.trade_type)
        }
        const page = params?.page || 1
        const pageSize = params?.pageSize || 20
        const start = (page - 1) * pageSize
        return filtered.slice(start, start + pageSize)
      },
    }),
    { name: 'tw-stock-portfolio' }
  )
)
