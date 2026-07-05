import { CURRENT_MONTH, lastMonths } from './date'

// ============================================================
// 年 / 季 / 月 期间口径的唯一入口(经营管理四页、任务清单、核抄共用)。
// 达成率口径(用户已确认):期间目标只累计数据窗内已有的月份,
// 例如「2026 年」= 2026-01 ~ 2026-06,页面标注「统计至 2026-06」。
// ============================================================

export type PeriodKind = 'year' | 'quarter' | 'month'

export interface Period {
  kind: PeriodKind
  key: string // '2026' | '2026-Q2' | '2026-06'
}

/** 数据窗:含当月的近 12 个月(升序:2025-07 ~ 2026-06) */
export const DATA_MONTHS = lastMonths(12)

export function yearOfMonth(month: string): string {
  return month.slice(0, 4)
}

export function quarterOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y}-Q${Math.ceil(m / 3)}`
}

/** 期间内且落在数据窗内的月份(升序) */
export function monthsInPeriod(p: Period): string[] {
  if (p.kind === 'month') return DATA_MONTHS.filter((m) => m === p.key)
  if (p.kind === 'quarter') return DATA_MONTHS.filter((m) => quarterOfMonth(m) === p.key)
  return DATA_MONTHS.filter((m) => yearOfMonth(m) === p.key)
}

const QUARTER_CN = ['一', '二', '三', '四']

export function formatPeriodLabel(p: Period): string {
  if (p.kind === 'month') {
    const [y, m] = p.key.split('-')
    return `${y} 年 ${Number(m)} 月`
  }
  if (p.kind === 'quarter') {
    const [y, q] = p.key.split('-Q')
    return `${y} 年${QUARTER_CN[Number(q) - 1]}季度`
  }
  return `${p.key} 年`
}

function uniq(list: string[]): string[] {
  return [...new Set(list)]
}

/** 期间选择项(新 → 旧);数据不满全期时括注覆盖月份范围 */
export function periodOptions(kind: PeriodKind): { key: string; label: string }[] {
  const keys =
    kind === 'month'
      ? [...DATA_MONTHS]
      : uniq(DATA_MONTHS.map(kind === 'quarter' ? quarterOfMonth : yearOfMonth))
  return keys.reverse().map((key) => {
    const p: Period = { kind, key }
    const months = monthsInPeriod(p)
    let label = formatPeriodLabel(p)
    const full = kind === 'year' ? 12 : kind === 'quarter' ? 3 : 1
    if (months.length < full && months.length > 0) {
      const first = Number(months[0].slice(5))
      const last = Number(months[months.length - 1].slice(5))
      label += `(${first}-${last} 月)`
    }
    return { key, label }
  })
}

/** 各维度的默认期间 = 当前月所在期间 */
export function defaultPeriodKey(kind: PeriodKind): string {
  if (kind === 'month') return CURRENT_MONTH
  if (kind === 'quarter') return quarterOfMonth(CURRENT_MONTH)
  return yearOfMonth(CURRENT_MONTH)
}
