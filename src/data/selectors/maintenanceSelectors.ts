import { demoNow, diffHours, lastMonths } from '../../lib/date'
import { MAINTENANCE_GRACE_HOURS } from '../constants'
import type { MaintenanceCategory, MaintenanceOrder } from '../types'

// ============================================================
// 维保口径:
// - 状态派生:已执行 done / 计划未到期 pending / 计划已过未执行 overdue
// - 计划完成率 = 已执行 / 应执行(计划时间 ≤ 现在)
// - 及时率     = 按期执行(实际 ≤ 计划 + 24h 容差)/ 已执行
// - 关单率     = 已执行 / 期间内全部计划(含未到期)
// ============================================================

export type MaintenanceStatus = 'done' | 'pending' | 'overdue'

export function deriveMaintenanceStatus(order: MaintenanceOrder, now = demoNow()): MaintenanceStatus {
  if (order.executedAt) return 'done'
  return order.plannedAt <= now ? 'overdue' : 'pending'
}

export function isMaintenanceOnTime(order: MaintenanceOrder): boolean {
  if (!order.executedAt) return false
  return diffHours(order.plannedAt, order.executedAt) <= MAINTENANCE_GRACE_HOURS
}

export interface MaintenanceStats {
  total: number
  executed: number
  due: number
  completionRate: number
  onTimeRate: number
  closeRate: number
  overdue: number
}

export function getMaintenanceStats(orders: MaintenanceOrder[], now = demoNow()): MaintenanceStats {
  const executed = orders.filter((o) => o.executedAt).length
  const due = orders.filter((o) => o.plannedAt <= now).length
  const onTime = orders.filter(isMaintenanceOnTime).length
  const overdue = orders.filter((o) => deriveMaintenanceStatus(o, now) === 'overdue').length
  return {
    total: orders.length,
    executed,
    due,
    completionRate: due === 0 ? 1 : Math.min(1, executed / due),
    onTimeRate: executed === 0 ? 1 : onTime / executed,
    closeRate: orders.length === 0 ? 1 : executed / orders.length,
    overdue,
  }
}

export function getMonthMaintenance(orders: MaintenanceOrder[], month: string, category?: MaintenanceCategory) {
  return orders.filter((o) => o.plannedAt.startsWith(month) && (!category || o.category === category))
}

export interface MonthlyMaintenancePoint {
  month: string
  planned: number
  executed: number
  onTimeRate: number
  completionRate: number
}

/** 月度集成分析:近 n 月逐月计划量 / 执行量 / 及时率 / 完成率 */
export function getMonthlyMaintenanceStats(
  orders: MaintenanceOrder[],
  n = 12,
  category?: MaintenanceCategory,
): MonthlyMaintenancePoint[] {
  return lastMonths(n).map((month) => {
    const list = getMonthMaintenance(orders, month, category)
    const stats = getMaintenanceStats(list)
    return {
      month,
      planned: list.length,
      executed: stats.executed,
      onTimeRate: stats.onTimeRate,
      completionRate: stats.completionRate,
    }
  })
}
