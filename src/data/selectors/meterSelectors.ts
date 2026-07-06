import type { MeterReading, UtilitySub } from '../types'

// ============================================================
// 能耗核抄口径(数据窗 24 个月:2024-06 ~ 2026-05,当月月末未核抄):
// - 月用量 = Σ(本期示数 − 上期示数)
// - 环比 mom = 本月 / 上月 − 1;同比 yoy = 本月 / 去年同月 − 1
// ============================================================

export function meterUsage(r: MeterReading): number {
  return r.currValue - r.prevValue
}

export function latestMeterMonth(readings: MeterReading[]): string {
  return readings.reduce((max, r) => (r.month > max ? r.month : max), '')
}

function monthUsage(readings: MeterReading[], month: string, type: UtilitySub): number {
  return readings.filter((r) => r.month === month && r.type === type).reduce((s, r) => s + meterUsage(r), 0)
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface UsageTrendPoint {
  month: string
  usage: number
  /** 环比(上月无数据为 null) */
  mom: number | null
  /** 同比(去年同月无数据为 null) */
  yoy: number | null
}

/** 最近 12 个可用月份的用量趋势(含同比/环比) */
export function getUsageTrend(readings: MeterReading[], type: UtilitySub): UsageTrendPoint[] {
  const months = [...new Set(readings.map((r) => r.month))].sort()
  const window = months.slice(-12)
  return window.map((month) => {
    const usage = monthUsage(readings, month, type)
    const prev = monthUsage(readings, shiftMonth(month, -1), type)
    const lastYear = monthUsage(readings, shiftMonth(month, -12), type)
    return {
      month,
      usage,
      mom: prev > 0 ? usage / prev - 1 : null,
      yoy: lastYear > 0 ? usage / lastYear - 1 : null,
    }
  })
}

export interface MeterMonthRow {
  reading: MeterReading
  usage: number
  /** 该表上月用量(环比基数) */
  prevUsage: number | null
}

/** 某月逐表明细(制式表单视图) */
export function getMeterMonthRows(readings: MeterReading[], month: string, type: UtilitySub): MeterMonthRow[] {
  const prevMonth = shiftMonth(month, -1)
  return readings
    .filter((r) => r.month === month && r.type === type)
    .sort((a, b) => a.meterNo.localeCompare(b.meterNo))
    .map((reading) => {
      const prev = readings.find((r) => r.meterNo === reading.meterNo && r.month === prevMonth)
      return { reading, usage: meterUsage(reading), prevUsage: prev ? meterUsage(prev) : null }
    })
}
