// 演示用固定「今天」锚点 —— 超时判定、欠费月数、12 个月趋势图全部以此为基准,
// 保证任何一天打开演示效果一致;运行时动作的时间戳 = 锚点日期 + 真实时钟时间。
export const DEMO_TODAY = '2026-06-06'
export const CURRENT_MONTH = '2026-06'

/** 当前演示时刻:锚点日期 + 真实时钟时间 */
export function demoNow(): string {
  const t = new Date()
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  const ss = String(t.getSeconds()).padStart(2, '0')
  return `${DEMO_TODAY}T${hh}:${mm}:${ss}`
}

export function diffHours(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 36e5
}

function fmtYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** DEMO_TODAY 往前 n 天、时间 time(默认 '10:00')的 ISO 时间 */
export function daysAgo(n: number, time = '10:00'): string {
  const d = new Date(`${DEMO_TODAY}T00:00:00`)
  d.setDate(d.getDate() - n)
  return `${fmtYmd(d)}T${time}:00`
}

/** DEMO_TODAY 往前 n 天的日期字符串 'yyyy-MM-dd' */
export function dateDaysAgo(n: number): string {
  return daysAgo(n).slice(0, 10)
}

/** 含当前月在内往前 n 个月,升序:['2025-07', ..., '2026-06'] */
export function lastMonths(n: number): string[] {
  const [y, m] = CURRENT_MONTH.split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/** 某月第 day 天的 ISO 时间:monthDay('2026-05', 3) → '2026-05-03T10:00:00' */
export function monthDay(month: string, day: number, time = '10:00'): string {
  return `${month}-${String(day).padStart(2, '0')}T${time}:00`
}

/** ISO 时间加 n 小时(可为小数) */
export function addHours(iso: string, hours: number): string {
  const d = new Date(iso)
  d.setTime(d.getTime() + hours * 3600e3)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${fmtYmd(d)}T${hh}:${mm}:00`
}

/** '2026-06-01T09:00:00' → '20260601'(用于工单号) */
export function compactDate(iso: string): string {
  return iso.slice(0, 10).replaceAll('-', '')
}
