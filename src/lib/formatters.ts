import { format, formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number | undefined | null, decimals = 2): string {
  const v = value ?? 0
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

export function formatChange(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatPrice(value)}`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
}

export function formatVolume(volume: number): string {
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}億`
  }
  if (volume >= 10000) {
    return `${(volume / 10000).toFixed(1)}萬`
  }
  return formatNumber(volume)
}

export function formatDate(date: string | Date, fmt = 'yyyy/MM/dd'): string {
  return format(new Date(date), fmt, { locale: zhTW })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhTW })
}

export function formatShares(shares: number): string {
  const lots = shares / 1000
  if (lots >= 1 && shares % 1000 === 0) {
    return `${lots} 張`
  }
  return `${formatNumber(shares)} 股`
}

export function calculateFee(amount: number, discount = 0.6): number {
  const fee = Math.floor(amount * 0.001425 * discount)
  return Math.max(fee, 20)
}

export function calculateTax(amount: number): number {
  return Math.floor(amount * 0.003)
}
