import { CURRENT_MONTH, lastMonths } from '../../lib/date'
import type { AppData, Bill, BillStatus, Household } from '../types'

export function getBillStatus(bill: Bill): BillStatus {
  if (bill.paidAmount >= bill.amount) return 'paid'
  if (bill.paidAmount > 0) return 'partial'
  return 'unpaid'
}

/** 该账单尚欠金额 */
export function billOutstanding(bill: Bill): number {
  return Math.max(0, bill.amount - bill.paidAmount)
}

const FEE_ORDER = { property: 0, water: 1, electricity: 2, parking: 3 } as const

/** 某户全部账单,按月份倒序、费用类型固定顺序 */
export function getHouseholdBills(data: Pick<AppData, 'bills'>, householdId: string): Bill[] {
  return data.bills
    .filter((b) => b.householdId === householdId)
    .sort((a, b) => b.month.localeCompare(a.month) || FEE_ORDER[a.feeType] - FEE_ORDER[b.feeType])
}

export interface Arrears {
  amount: number
  /** 含未缴账单的去重月份数 */
  months: number
  bills: Bill[]
}

export function getArrears(data: Pick<AppData, 'bills'>, householdId: string): Arrears {
  const owing = data.bills.filter((b) => b.householdId === householdId && billOutstanding(b) > 0)
  return {
    amount: owing.reduce((s, b) => s + billOutstanding(b), 0),
    months: new Set(owing.map((b) => b.month)).size,
    bills: owing.sort((a, b) => a.month.localeCompare(b.month)),
  }
}

export interface CollectionSummary {
  receivable: number
  received: number
  rate: number
}

function summarize(bills: Bill[]): CollectionSummary {
  const receivable = bills.reduce((s, b) => s + b.amount, 0)
  const received = bills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
  return { receivable, received, rate: receivable === 0 ? 1 : received / receivable }
}

export interface CollectionScope {
  communityId?: string
  buildingId?: string
  unitId?: string
  feeType?: Bill['feeType']
}

/** 某月(含范围/费用类型过滤)的应收/实收/收缴率 */
export function getMonthCollection(
  data: Pick<AppData, 'bills' | 'households'>,
  month: string,
  scope: CollectionScope = {},
): CollectionSummary {
  const inScope = scopeFilter(data.households, scope)
  const bills = data.bills.filter(
    (b) => b.month === month && (!scope.feeType || b.feeType === scope.feeType) && inScope(b.householdId),
  )
  return summarize(bills)
}

function scopeFilter(households: Household[], scope: CollectionScope): (hid: string) => boolean {
  if (!scope.communityId && !scope.buildingId && !scope.unitId) return () => true
  const ok = new Set(
    households
      .filter(
        (h) =>
          (!scope.communityId || h.communityId === scope.communityId) &&
          (!scope.buildingId || h.buildingId === scope.buildingId) &&
          (!scope.unitId || h.unitId === scope.unitId),
      )
      .map((h) => h.id),
  )
  return (hid) => ok.has(hid)
}

/** 近 n 个月收缴率趋势(升序) */
export function getCollectionTrend(
  data: Pick<AppData, 'bills' | 'households'>,
  n = 12,
): { month: string; rate: number; receivable: number; received: number }[] {
  return lastMonths(n).map((month) => {
    const s = getMonthCollection(data, month)
    return { month, rate: s.rate, receivable: s.receivable, received: s.received }
  })
}

/** 各小区当月收缴对比 */
export function getCommunityCollection(
  data: Pick<AppData, 'bills' | 'households' | 'communities'>,
  month = CURRENT_MONTH,
): ({ communityId: string; name: string } & CollectionSummary)[] {
  return data.communities.map((c) => ({
    communityId: c.id,
    name: c.name,
    ...getMonthCollection(data, month, { communityId: c.id }),
  }))
}

/** 某小区各楼栋当月收缴对比 */
export function getBuildingCollection(
  data: Pick<AppData, 'bills' | 'households' | 'buildings'>,
  communityId: string,
  month = CURRENT_MONTH,
): ({ buildingId: string; no: string } & CollectionSummary)[] {
  return data.buildings
    .filter((b) => b.communityId === communityId)
    .map((b) => ({ buildingId: b.id, no: b.no, ...getMonthCollection(data, month, { buildingId: b.id }) }))
}

/** 某楼栋各单元当月收缴对比 */
export function getUnitCollection(
  data: Pick<AppData, 'bills' | 'households' | 'units'>,
  buildingId: string,
  month = CURRENT_MONTH,
): ({ unitId: string; no: string } & CollectionSummary)[] {
  return data.units
    .filter((u) => u.buildingId === buildingId)
    .map((u) => ({ unitId: u.id, no: u.no, ...getMonthCollection(data, month, { unitId: u.id }) }))
}

/** 全部欠费户(欠费金额降序) */
export function getHouseholdsWithArrears(
  data: Pick<AppData, 'bills' | 'households'>,
): { household: Household; arrears: Arrears }[] {
  return data.households
    .map((household) => ({ household, arrears: getArrears(data, household.id) }))
    .filter((row) => row.arrears.amount > 0)
    .sort((a, b) => b.arrears.amount - a.arrears.amount)
}

export function getVacancyRate(data: Pick<AppData, 'households'>): number {
  if (data.households.length === 0) return 0
  return data.households.filter((h) => h.isVacant).length / data.households.length
}
