import { monthsInPeriod, type Period } from '../../lib/period'
import { lastMonths } from '../../lib/date'
import type { AppData, Bill, BillSubType, Building, Company, FeeCategory, Zone } from '../types'

// ============================================================
// 经营管理四页的达成口径:
// 达成金额 = 期间内实收(Σ min(paid, amount));目标 = Σ期间内月目标;
// 达成率 = 达成 / 目标。期间只累计数据窗内已有月份(见 lib/period.ts)。
// ============================================================

type RevenueSlice = Pick<AppData, 'bills' | 'revenueTargets'>

const received = (bills: Bill[]) => bills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
const receivable = (bills: Bill[]) => bills.reduce((s, b) => s + b.amount, 0)

export interface Achievement {
  achieved: number
  target: number
  rate: number
  receivable: number
}

export function getPeriodAchievement(data: RevenueSlice, category: FeeCategory, period: Period): Achievement {
  const months = new Set(monthsInPeriod(period))
  const bills = data.bills.filter((b) => b.category === category && months.has(b.month))
  const target = data.revenueTargets
    .filter((t) => t.category === category && months.has(t.month))
    .reduce((s, t) => s + t.amount, 0)
  const achieved = received(bills)
  return { achieved, target, rate: target === 0 ? 1 : achieved / target, receivable: receivable(bills) }
}

export interface MonthAchievementPoint {
  month: string
  achieved: number
  target: number
  receivable: number
}

/** 近 12 月逐月达成 vs 目标(趋势图 + 明细表共用) */
export function getMonthlyAchievementSeries(data: RevenueSlice, category: FeeCategory): MonthAchievementPoint[] {
  return lastMonths(12).map((month) => {
    const bills = data.bills.filter((b) => b.category === category && b.month === month)
    const target = data.revenueTargets
      .filter((t) => t.category === category && t.month === month)
      .reduce((s, t) => s + t.amount, 0)
    return { month, achieved: received(bills), target, receivable: receivable(bills) }
  })
}

/** 期间内分口径达成(车辆三口径 / 水电两口径 / 增值按合同类型) */
export function getSubTypeAchievement(
  data: RevenueSlice,
  category: FeeCategory,
  subType: BillSubType,
  period: Period,
): { achieved: number; receivable: number } {
  const months = new Set(monthsInPeriod(period))
  const bills = data.bills.filter((b) => b.category === category && b.subType === subType && months.has(b.month))
  return { achieved: received(bills), receivable: receivable(bills) }
}

/** 近 12 月分口径逐月达成(多序列趋势图) */
export function getSubTypeMonthlySeries(
  data: Pick<AppData, 'bills'>,
  category: FeeCategory,
  subTypes: BillSubType[],
): { month: string; values: Record<string, number>; total: number }[] {
  return lastMonths(12).map((month) => {
    const values: Record<string, number> = {}
    let total = 0
    for (const sub of subTypes) {
      const v = received(data.bills.filter((b) => b.category === category && b.subType === sub && b.month === month))
      values[sub] = v
      total += v
    }
    return { month, values, total }
  })
}

// ===== 物业服务收费下钻:园区 → 区 → 楼栋 → 企业 =====

export interface DrillRow extends Achievement {
  companyCount: number
}

type DrillSlice = Pick<AppData, 'bills' | 'companies' | 'revenueTargets'>

function drillAchievement(data: DrillSlice, period: Period, companyIds: Set<string>) {
  const months = new Set(monthsInPeriod(period))
  const bills = data.bills.filter(
    (b) => b.category === 'property' && months.has(b.month) && !!b.companyId && companyIds.has(b.companyId),
  )
  return { achieved: received(bills), receivable: receivable(bills) }
}

export interface ZoneDrillRow {
  zone: Zone
  companyCount: number
  achieved: number
  receivable: number
  rate: number
}

/** 区级下钻行(物业服务费;rate = 实收/应收) */
export function getZoneDrillRows(data: DrillSlice & Pick<AppData, 'zones'>, period: Period): ZoneDrillRow[] {
  return data.zones
    .map((zone) => {
      const companies = data.companies.filter((c) => c.zoneId === zone.id)
      const ids = new Set(companies.map((c) => c.id))
      const { achieved, receivable: recv } = drillAchievement(data, period, ids)
      return {
        zone,
        companyCount: companies.length,
        achieved,
        receivable: recv,
        rate: recv === 0 ? 1 : achieved / recv,
      }
    })
    .filter((r) => r.companyCount > 0)
}

export interface BuildingDrillRow {
  building: Building
  companyCount: number
  /** 整栋独占时直达企业 */
  wholeCompany?: Company
  achieved: number
  receivable: number
  rate: number
}

export function getBuildingDrillRows(
  data: DrillSlice & Pick<AppData, 'buildings'>,
  zoneId: string,
  period: Period,
): BuildingDrillRow[] {
  return data.buildings
    .filter((b) => b.zoneId === zoneId)
    .map((building) => {
      const companies = data.companies.filter((c) => c.buildingId === building.id)
      const ids = new Set(companies.map((c) => c.id))
      const { achieved, receivable: recv } = drillAchievement(data, period, ids)
      return {
        building,
        companyCount: companies.length,
        wholeCompany: companies.length === 1 && companies[0].occupancy.type === 'whole' ? companies[0] : undefined,
        achieved,
        receivable: recv,
        rate: recv === 0 ? 1 : achieved / recv,
      }
    })
    .filter((r) => r.companyCount > 0)
}

export interface CompanyDrillRow {
  company: Company
  achieved: number
  receivable: number
  rate: number
}

export function getCompanyDrillRows(data: DrillSlice, buildingId: string, period: Period): CompanyDrillRow[] {
  return data.companies
    .filter((c) => c.buildingId === buildingId)
    .map((company) => {
      const { achieved, receivable: recv } = drillAchievement(data, period, new Set([company.id]))
      return { company, achieved, receivable: recv, rate: recv === 0 ? 1 : achieved / recv }
    })
    .sort((a, b) => b.receivable - a.receivable)
}
