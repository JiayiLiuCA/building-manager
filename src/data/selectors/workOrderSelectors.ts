import { demoNow, diffHours } from '../../lib/date'
import { SLA_HOURS } from '../constants'
import type { AppData, WorkOrder, WorkOrderEventType, WorkOrderStatus } from '../types'

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
    const s = STATUS_EVENT[wo.events[i].type]
    if (s) return s
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

/**
 * 超时:维修尚未完工且距报修已超过 SLA。
 * 完工后不再标记超时(等待签字不算服务问题),迟到只计入及时率。
 */
export function isWorkOrderOverdue(wo: WorkOrder, now = demoNow()): boolean {
  if (completedAt(wo) || isWorkOrderClosed(wo)) return false
  return diffHours(reportedAt(wo), now) > SLA_HOURS
}

/** 已超时多少小时(仅对超时工单有意义) */
export function overdueHours(wo: WorkOrder, now = demoNow()): number {
  return Math.floor(diffHours(reportedAt(wo), now) - SLA_HOURS)
}

/** 维修及时率 = 按时完工 / (已完工 + 当前超时未完工) */
export function getRepairOnTimeRate(data: Pick<AppData, 'workOrders'>): number {
  let timely = 0
  let total = 0
  for (const wo of data.workOrders) {
    const done = completedAt(wo)
    if (done) {
      total++
      if (diffHours(reportedAt(wo), done) <= SLA_HOURS) timely++
    } else if (isWorkOrderOverdue(wo)) {
      total++
    }
  }
  return total === 0 ? 1 : timely / total
}

export function getHouseholdWorkOrders(data: Pick<AppData, 'workOrders'>, householdId: string): WorkOrder[] {
  return data.workOrders
    .filter((wo) => wo.householdId === householdId)
    .sort((a, b) => reportedAt(b).localeCompare(reportedAt(a)))
}

/** 当前超时未完工的工单 */
export function getOpenOverdueWorkOrders(data: Pick<AppData, 'workOrders'>): WorkOrder[] {
  const now = demoNow()
  return data.workOrders.filter((wo) => isWorkOrderOverdue(wo, now))
}
