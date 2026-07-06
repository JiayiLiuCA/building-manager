import { demoNow, diffHours, lastMonths } from '../../lib/date'
import { RESPONSE_SLA_HOURS, SLA_HOURS } from '../constants'
import type { AppData, WorkOrder, WorkOrderCategory, WorkOrderEventType, WorkOrderStatus } from '../types'

// 状态由「最后一个状态事件」派生(RATED 是附加事件,不参与派生)
const STATUS_EVENT: Partial<Record<WorkOrderEventType, WorkOrderStatus>> = {
  REPORTED: 'pending',
  ACCEPTED: 'accepted',
  DISPATCHED: 'dispatched',
  APPOINTMENT_SET: 'in_progress',
  COMPLETED: 'done_pending_sign',
  SIGNED: 'closed',
  CLOSED: 'closed',
}

export function deriveWorkOrderStatus(wo: WorkOrder): WorkOrderStatus {
  for (let i = wo.events.length - 1; i >= 0; i--) {
    const mapped = STATUS_EVENT[wo.events[i].type]
    if (mapped) return mapped
  }
  return 'pending'
}

export function findEvent(wo: WorkOrder, type: WorkOrderEventType) {
  return wo.events.find((e) => e.type === type)
}

export function reportedAt(wo: WorkOrder): string {
  return wo.events[0]?.at ?? demoNow()
}

export function completedAt(wo: WorkOrder): string | undefined {
  return findEvent(wo, 'COMPLETED')?.at
}

export function isWorkOrderClosed(wo: WorkOrder): boolean {
  return deriveWorkOrderStatus(wo) === 'closed'
}

/** 超时:未完工且未关单,且报修至今超过 SLA(完工后迟到只影响完成及时率,不计超时) */
export function isWorkOrderOverdue(wo: WorkOrder, now = demoNow()): boolean {
  if (completedAt(wo) || isWorkOrderClosed(wo)) return false
  return diffHours(reportedAt(wo), now) > SLA_HOURS
}

export function overdueHours(wo: WorkOrder, now = demoNow()): number {
  return Math.floor(diffHours(reportedAt(wo), now) - SLA_HOURS)
}

type WoSlice = Pick<AppData, 'workOrders'>

export function getCompanyWorkOrders(data: WoSlice, companyId: string): WorkOrder[] {
  return data.workOrders
    .filter((wo) => wo.companyId === companyId)
    .sort((a, b) => reportedAt(b).localeCompare(reportedAt(a)))
}

export function getOpenOverdueWorkOrders(data: WoSlice, now = demoNow()): WorkOrder[] {
  return data.workOrders.filter((wo) => isWorkOrderOverdue(wo, now))
}

/** 响应及时率:已接单的工单中,报修→接单 ≤ 4 小时的占比;超时未接单的开放单计入分母 */
export function getResponseOnTimeRate(wos: WorkOrder[], now = demoNow()): number {
  let total = 0
  let timely = 0
  for (const wo of wos) {
    const accepted = findEvent(wo, 'ACCEPTED')
    if (accepted) {
      total += 1
      if (diffHours(reportedAt(wo), accepted.at) <= RESPONSE_SLA_HOURS) timely += 1
    } else if (deriveWorkOrderStatus(wo) === 'pending' && diffHours(reportedAt(wo), now) > RESPONSE_SLA_HOURS) {
      total += 1
    }
  }
  return total === 0 ? 1 : timely / total
}

/** 完成及时率:按时完工 /(已完工 + 当前超时未完工) */
export function getCompletionOnTimeRate(wos: WorkOrder[], now = demoNow()): number {
  let total = 0
  let timely = 0
  for (const wo of wos) {
    const done = completedAt(wo)
    if (done) {
      total += 1
      if (diffHours(reportedAt(wo), done) <= SLA_HOURS) timely += 1
    } else if (isWorkOrderOverdue(wo, now)) {
      total += 1
    }
  }
  return total === 0 ? 1 : timely / total
}

/** 关单率:已关单 / 全部 */
export function getCloseRate(wos: WorkOrder[]): number {
  if (wos.length === 0) return 1
  return wos.filter(isWorkOrderClosed).length / wos.length
}

export function getMonthWorkOrders(data: WoSlice, month: string): WorkOrder[] {
  return data.workOrders.filter((wo) => reportedAt(wo).startsWith(month))
}

export interface MonthlyWoStats {
  month: string
  total: number
  companyCount: number
  publicCount: number
  closed: number
  closeRate: number
  responseRate: number
  completionRate: number
}

/** 月度集成分析:近 n 月逐月 量 / 关单率 / 响应及时率 / 完成及时率 */
export function getMonthlyWoStats(data: WoSlice, n = 12): MonthlyWoStats[] {
  return lastMonths(n).map((month) => {
    const wos = getMonthWorkOrders(data, month)
    return {
      month,
      total: wos.length,
      companyCount: wos.filter((w) => w.kind === 'company').length,
      publicCount: wos.filter((w) => w.kind === 'public').length,
      closed: wos.filter(isWorkOrderClosed).length,
      closeRate: getCloseRate(wos),
      responseRate: getResponseOnTimeRate(wos),
      completionRate: getCompletionOnTimeRate(wos),
    }
  })
}

/** 类型分布(近 12 月或指定集合) */
export function getWoCategoryDist(wos: WorkOrder[]): { category: WorkOrderCategory; count: number }[] {
  const map = new Map<WorkOrderCategory, number>()
  for (const wo of wos) map.set(wo.category, (map.get(wo.category) ?? 0) + 1)
  return [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)
}
