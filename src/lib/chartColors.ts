/**
 * Resolve CSS custom property (HSL values) to an rgb/rgba string
 * that chart libraries (lightweight-charts, echarts) can parse.
 *
 * CSS vars store bare HSL values like "222 47% 11%".
 * This converts them to "rgb(r,g,b)" or "rgba(r,g,b,a)".
 */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
  }
  return [f(0), f(8), f(4)]
}

export function cssVar(name: string, opacity?: number): string {
  if (typeof window === 'undefined') return 'rgb(128,128,128)'
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim()
  if (!raw) return 'rgb(128,128,128)'

  const parts = raw.replace(/%/g, '').split(/[\s,]+/).map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return 'rgb(128,128,128)'

  const [r, g, b] = hslToRgb(parts[0], parts[1], parts[2])
  if (opacity != null && opacity < 1) {
    return `rgba(${r},${g},${b},${opacity})`
  }
  return `rgb(${r},${g},${b})`
}
