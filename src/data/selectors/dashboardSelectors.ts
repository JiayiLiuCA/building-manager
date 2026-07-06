import { CURRENT_MONTH, demoNow } from '../../lib/date'
import type { AppData } from '../types'
import { getMonthCollection, getWaiverStats } from './billingSelectors'
import { getCurrentSatisfaction } from './satisfactionSelectors'
import {
  deriveWorkOrderStatus,
  getCloseRate,
  getMonthWorkOrders,
  isWorkOrderOverdue,
} from './workOrderSelectors'

// ============================================================
// 驾驶舱 KPI 与图表数据。输入一律为「已 scope 的数据视图」。
// ============================================================

type DashboardSlice = Pick<
  AppData,
  'bills' | 'companies' | 'waivers' | 'workOrders' | 'surveys' | 'surveyResponses' | 'zones'
>

export interface DashboardKpis {
  receivable: number
  received: number
  collectionRate: number
  waiverMonth: number
  waiverYear: number
  waiverRatio: number
  woNew: number
  woCloseRate: number
  satisfaction: number
}

export function getDashboardKpis(data: DashboardSlice): DashboardKpis {
  const collection = getMonthCollection(data, CURRENT_MONTH)
  const waiver = getWaiverStats(data, CURRENT_MONTH)
  const monthWos = getMonthWorkOrders(data, CURRENT_MONTH)
  const satisfaction = getCurrentSatisfaction(data)
  return {
    receivable: collection.receivable,
    received: collection.received,
    collectionRate: collection.rate,
    waiverMonth: waiver.monthAmount,
    waiverYear: waiver.yearAmount,
    waiverRatio: waiver.monthRatio,
    woNew: monthWos.length,
    woCloseRate: getCloseRate(monthWos),
    satisfaction: satisfaction.score,
  }
}

/** 收缴对比(按区;柱上直接标数值) */
export interface ZoneCompareRow {
  zoneId: string
  zoneName: string
  receivable: number
  received: number
  rate: number
}

export function getZoneCompare(data: DashboardSlice, month = CURRENT_MONTH): ZoneCompareRow[] {
  return data.zones
    .map((zone) => {
      const summary = getMonthCollection(data, month, { zoneId: zone.id })
      return { zoneId: zone.id, zoneName: zone.name, ...summary }
    })
    .filter((r) => r.receivable > 0)
}

/** 工单状态分布(互斥分桶,超时优先) */
export interface WoStatusBucket {
  key: 'pending' | 'processing' | 'done' | 'overdue'
  label: string
  count: number
}

export function getWorkOrderStatusDist(data: Pick<AppData, 'workOrders'>, now = demoNow()): WoStatusBucket[] {
  const buckets: Record<WoStatusBucket['key'], number> = { pending: 0, processing: 0, done: 0, overdue: 0 }
  for (const wo of data.workOrders) {
    if (isWorkOrderOverdue(wo, now)) {
      buckets.overdue += 1
      continue
    }
    const status = deriveWorkOrderStatus(wo)
    if (status === 'pending' || status === 'accepted') buckets.pending += 1
    else if (status === 'dispatched' || status === 'in_progress') buckets.processing += 1
    else buckets.done += 1
  }
  return [
    { key: 'pending', label: '待派单', count: buckets.pending },
    { key: 'processing', label: '处理中', count: buckets.processing },
    { key: 'done', label: '已完成', count: buckets.done },
    { key: 'overdue', label: '超时', count: buckets.overdue },
  ]
}
