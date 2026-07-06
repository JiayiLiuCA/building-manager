import { CURRENT_MONTH, lastMonths } from '../../lib/date'
import type { AppData, Bill, BillStatus, Building, Company, FeeCategory } from '../types'

// ============================================================
// 账单 / 收缴聚合。输入一律为「已 scope 的数据视图」(见 scope.ts)。
// 口径:应收 = Σamount(减免后净额);实收 = Σmin(paidAmount, amount)。
// ============================================================

export function getBillStatus(bill: Bill): BillStatus {
  if (bill.paidAmount >= bill.amount) return 'paid'
  if (bill.paidAmount > 0) return 'partial'
  return 'unpaid'
}

export function billOutstanding(bill: Bill): number {
  return Math.max(0, bill.amount - bill.paidAmount)
}

export const FEE_ORDER: Record<FeeCategory, number> = { property: 0, utility: 1, vehicle: 2, valueAdded: 3 }

type BillsSlice = Pick<AppData, 'bills'>

export function getCompanyBills(data: BillsSlice, companyId: string): Bill[] {
  return data.bills
    .filter((b) => b.companyId === companyId)
    .sort((a, b) => b.month.localeCompare(a.month) || FEE_ORDER[a.category] - FEE_ORDER[b.category])
}

export interface MonthlyBills {
  month: string
  billed: number
  paid: number
  outstanding: number
  status: BillStatus | 'none'
  lines: Bill[]
}

/** 某企业近 n 个月按月聚合(最新月在前) */
export function getCompanyMonthlyBills(data: BillsSlice, companyId: string, n = 12): MonthlyBills[] {
  const months = lastMonths(n)
  return months
    .map((month) => {
      const lines = data.bills
        .filter((b) => b.companyId === companyId && b.month === month)
        .sort((a, b) => FEE_ORDER[a.category] - FEE_ORDER[b.category])
      const billed = lines.reduce((s, b) => s + b.amount, 0)
      const paid = lines.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
      const status: MonthlyBills['status'] =
        lines.length === 0 ? 'none' : paid >= billed ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
      return { month, billed, paid, outstanding: billed - paid, status, lines }
    })
    .reverse()
}

export interface Arrears {
  amount: number
  months: number
  bills: Bill[]
}

/** 某企业当前欠费:金额、去重月份数、欠费账单(按月升序) */
export function getArrears(data: BillsSlice, companyId: string): Arrears {
  const owing = data.bills
    .filter((b) => b.companyId === companyId && b.paidAmount < b.amount)
    .sort((a, b) => a.month.localeCompare(b.month) || FEE_ORDER[a.category] - FEE_ORDER[b.category])
  return {
    amount: owing.reduce((s, b) => s + billOutstanding(b), 0),
    months: new Set(owing.map((b) => b.month)).size,
    bills: owing,
  }
}

export interface CollectionScope {
  zoneId?: string
  buildingId?: string
  companyId?: string
  category?: FeeCategory
  subType?: Bill['subType']
}

export interface CollectionSummary {
  receivable: number
  received: number
  rate: number
}

type CollectSlice = Pick<AppData, 'bills' | 'companies'>

function scopedBills(data: CollectSlice, month: string, scope: CollectionScope): Bill[] {
  let companyFilter: Set<string> | null = null
  if (scope.companyId) companyFilter = new Set([scope.companyId])
  else if (scope.buildingId) companyFilter = new Set(data.companies.filter((c) => c.buildingId === scope.buildingId).map((c) => c.id))
  else if (scope.zoneId) companyFilter = new Set(data.companies.filter((c) => c.zoneId === scope.zoneId).map((c) => c.id))

  return data.bills.filter((b) => {
    if (b.month !== month) return false
    if (scope.category && b.category !== scope.category) return false
    if (scope.subType && b.subType !== scope.subType) return false
    if (companyFilter) return !!b.companyId && companyFilter.has(b.companyId)
    return true // 无空间范围:含园区级账单
  })
}

export function getMonthCollection(data: CollectSlice, month = CURRENT_MONTH, scope: CollectionScope = {}): CollectionSummary {
  const bills = scopedBills(data, month, scope)
  const receivable = bills.reduce((s, b) => s + b.amount, 0)
  const received = bills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
  return { receivable, received, rate: receivable === 0 ? 1 : received / receivable }
}

export interface CollectionTrendPoint extends CollectionSummary {
  month: string
}

export function getCollectionTrend(data: CollectSlice, n = 12, scope: CollectionScope = {}): CollectionTrendPoint[] {
  return lastMonths(n).map((month) => ({ month, ...getMonthCollection(data, month, scope) }))
}

// ===== 楼栋收缴率表(按区分组 + 区小计 + 总计)=====

export interface BuildingCollectionRow extends CollectionSummary {
  building: Building
  companyCount: number
  /** 整栋独占时 = 该企业(楼栋收缴率即企业收缴率) */
  wholeCompany?: Company
}

export interface ZoneCollectionGroup {
  zoneId: string
  zoneName: string
  rows: BuildingCollectionRow[]
  subtotal: CollectionSummary
}

export interface BuildingCollectionTable {
  groups: ZoneCollectionGroup[]
  /** 总计(不含园区级账单) */
  total: CollectionSummary
}

type SpaceSlice = Pick<AppData, 'bills' | 'companies' | 'buildings' | 'zones'>

export function getBuildingCollectionTable(data: SpaceSlice, month = CURRENT_MONTH): BuildingCollectionTable {
  const groups: ZoneCollectionGroup[] = []
  let totalReceivable = 0
  let totalReceived = 0

  for (const zone of data.zones) {
    const buildings = data.buildings.filter((b) => b.zoneId === zone.id)
    const rows: BuildingCollectionRow[] = []
    for (const building of buildings) {
      const companies = data.companies.filter((c) => c.buildingId === building.id)
      if (companies.length === 0) continue // 可见范围外的楼栋不出行
      const summary = getMonthCollection(data, month, { buildingId: building.id })
      rows.push({
        building,
        companyCount: companies.length,
        wholeCompany: companies.length === 1 && companies[0].occupancy.type === 'whole' ? companies[0] : undefined,
        ...summary,
      })
    }
    if (rows.length === 0) continue
    const receivable = rows.reduce((s, r) => s + r.receivable, 0)
    const received = rows.reduce((s, r) => s + r.received, 0)
    groups.push({
      zoneId: zone.id,
      zoneName: zone.name,
      rows,
      subtotal: { receivable, received, rate: receivable === 0 ? 1 : received / receivable },
    })
    totalReceivable += receivable
    totalReceived += received
  }

  return {
    groups,
    total: {
      receivable: totalReceivable,
      received: totalReceived,
      rate: totalReceivable === 0 ? 1 : totalReceived / totalReceivable,
    },
  }
}

// ===== 客服个人收缴率表(+ 合计行)=====

export interface CsCollectionRow extends CollectionSummary {
  csUsername: string
  csName: string
  companyCount: number
}

export interface CsCollectionTable {
  rows: CsCollectionRow[]
  total: CollectionSummary
}

type CsSlice = Pick<AppData, 'bills' | 'companies' | 'csAssignments' | 'accounts'>

export function getCsCollectionTable(data: CsSlice, month = CURRENT_MONTH): CsCollectionTable {
  const visible = new Set(data.companies.map((c) => c.id))
  const rows: CsCollectionRow[] = []
  for (const assignment of data.csAssignments) {
    const companyIds = assignment.companyIds.filter((id) => visible.has(id))
    if (companyIds.length === 0) continue
    const idSet = new Set(companyIds)
    const bills = data.bills.filter((b) => b.month === month && b.companyId && idSet.has(b.companyId))
    const receivable = bills.reduce((s, b) => s + b.amount, 0)
    const received = bills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
    rows.push({
      csUsername: assignment.csUsername,
      csName: data.accounts.find((a) => a.username === assignment.csUsername)?.displayName ?? assignment.csUsername,
      companyCount: companyIds.length,
      receivable,
      received,
      rate: receivable === 0 ? 1 : received / receivable,
    })
  }
  const receivable = rows.reduce((s, r) => s + r.receivable, 0)
  const received = rows.reduce((s, r) => s + r.received, 0)
  return { rows, total: { receivable, received, rate: receivable === 0 ? 1 : received / receivable } }
}

// ===== 欠费总览(驾驶舱次要紧凑卡)=====

export interface ArrearsOverview {
  totalAmount: number
  companyCount: number
  rows: { company: Company; arrears: Arrears }[]
}

type ArrearsSlice = Pick<AppData, 'bills' | 'companies'>

/** 历史 + 当期全部欠费(仅企业账单),金额降序 */
export function getArrearsOverview(data: ArrearsSlice): ArrearsOverview {
  const rows = data.companies
    .map((company) => ({ company, arrears: getArrears(data, company.id) }))
    .filter((r) => r.arrears.amount > 0)
    .sort((a, b) => b.arrears.amount - a.arrears.amount)
  return {
    totalAmount: rows.reduce((s, r) => s + r.arrears.amount, 0),
    companyCount: rows.length,
    rows,
  }
}

// ===== 减免聚合(驾驶舱 KPI)=====

export interface WaiverStats {
  monthAmount: number
  yearAmount: number
  /** 本月减免占本月应收(含减免前口径)比 */
  monthRatio: number
}

type WaiverSlice = Pick<AppData, 'bills' | 'waivers'>

export function getWaiverStats(data: WaiverSlice, month = CURRENT_MONTH): WaiverStats {
  const year = month.slice(0, 4)
  const monthAmount = data.waivers.filter((w) => w.month === month).reduce((s, w) => s + w.amount, 0)
  const yearAmount = data.waivers.filter((w) => w.month.startsWith(year)).reduce((s, w) => s + w.amount, 0)
  const receivable = data.bills.filter((b) => b.month === month).reduce((s, b) => s + b.amount, 0)
  const gross = receivable + monthAmount
  return { monthAmount, yearAmount, monthRatio: gross === 0 ? 0 : monthAmount / gross }
}

export function getCompanyWaivers(data: Pick<AppData, 'waivers'>, companyId: string) {
  return data.waivers.filter((w) => w.companyId === companyId).sort((a, b) => b.month.localeCompare(a.month))
}
