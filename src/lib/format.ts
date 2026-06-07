export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** ratio 为 0-1 的比例:formatPercent(0.883) → '88.3%' */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function formatDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : '—'
}

export function formatDateTime(iso?: string): string {
  return iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : '—'
}

/** '2026-06' → '2026年6月' */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}
