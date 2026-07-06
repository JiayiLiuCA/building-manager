// 图表显性数值的统一工具:所有 Recharts 图表必须常显数值(LabelList/label),
// 金额统一「万」口径标注,避免逐图手写格式化。

/** 金额 → 紧凑标签:1234567 → '123.5万';小额 → '1,234' */
export function moneyLabel(value: number): string {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}万`
  return Math.round(value).toLocaleString('zh-CN')
}

/** LabelList formatter 安全包装(recharts 的 label 参数可能为字符串/undefined) */
export function moneyLabelFormatter(value: unknown): string {
  const n = Number(value)
  return Number.isFinite(n) ? moneyLabel(n) : ''
}

/** 金额 → '¥1,234,567'(表格用,不带小数) */
export function formatYuan(value: number): string {
  return `¥${Math.round(value).toLocaleString('zh-CN')}`
}

/** 金额 → '123.5 万元' */
export function formatWan(value: number): string {
  return `${(value / 10000).toFixed(1)} 万元`
}

/** 0-1 比率 → 柱/点上百分比标签 */
export function pctLabel(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

/** '2026-06' → '26/06'(坐标轴刻度) */
export function monthTick(month: string): string {
  return month.slice(2).replace('-', '/')
}

/** 收缴率文字色:≥90% 绿 / ≥80% 橙 / 其余红 */
export function rateTextClass(rate: number): string {
  if (rate >= 0.9) return 'text-emerald-600'
  if (rate >= 0.8) return 'text-amber-600'
  return 'text-red-600'
}
