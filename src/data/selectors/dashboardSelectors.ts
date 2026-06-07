import { CURRENT_MONTH } from '../../lib/date'
import type { AppData } from '../types'
import { getArrears, getMonthCollection, getVacancyRate } from './billingSelectors'
import { deriveComplaintStatus, getComplaintSatisfactionRate, isComplaintOpen } from './complaintSelectors'
import { getDunningRows } from './dunningSelectors'
import {
  deriveWorkOrderStatus,
  getOpenOverdueWorkOrders,
  getRepairOnTimeRate,
  isWorkOrderOverdue,
  overdueHours,
} from './workOrderSelectors'

export interface DashboardKpis {
  collectionRate: number
  receivable: number
  received: number
  vacancyRate: number
  onTimeRate: number
  complaintSatisfaction: number
}

export function getDashboardKpis(data: AppData): DashboardKpis {
  const collection = getMonthCollection(data, CURRENT_MONTH)
  return {
    collectionRate: collection.rate,
    receivable: collection.receivable,
    received: collection.received,
    vacancyRate: getVacancyRate(data),
    onTimeRate: getRepairOnTimeRate(data),
    complaintSatisfaction: getComplaintSatisfactionRate(data),
  }
}

/** 工单状态分布(互斥分桶,超时桶优先) */
export function getWorkOrderStatusDist(
  data: Pick<AppData, 'workOrders'>,
): { key: string; label: string; value: number }[] {
  const buckets = { overdue: 0, pending: 0, in_progress: 0, done: 0 }
  for (const wo of data.workOrders) {
    if (isWorkOrderOverdue(wo)) {
      buckets.overdue++
      continue
    }
    const status = deriveWorkOrderStatus(wo)
    if (status === 'pending' || status === 'accepted') buckets.pending++
    else if (status === 'dispatched' || status === 'in_progress') buckets.in_progress++
    else buckets.done++
  }
  return [
    { key: 'pending', label: '待派单', value: buckets.pending },
    { key: 'in_progress', label: '处理中', value: buckets.in_progress },
    { key: 'done', label: '已完成', value: buckets.done },
    { key: 'overdue', label: '超时', value: buckets.overdue },
  ]
}

/** 业主满意度分布(已评价工单的 1-5 星) */
export function getSatisfactionDist(data: Pick<AppData, 'workOrders'>): { rating: string; count: number }[] {
  const counts = [0, 0, 0, 0, 0]
  for (const wo of data.workOrders) {
    if (wo.satisfactionRating) counts[wo.satisfactionRating - 1]++
  }
  return counts.map((count, i) => ({ rating: `${i + 1}星`, count }))
}

export interface RiskItem {
  id: string
  level: 'danger' | 'warning' | 'info'
  text: string
  link: string
}

/** 驾驶舱重要事项 / 风险清单 —— 每条带深链跳到对应模块 */
export function getRiskList(data: AppData): RiskItem[] {
  const risks: RiskItem[] = []

  // 1. 长期欠费、催缴无果已上报的户(显示实时欠费月数)
  for (const record of data.dunningRecords.filter((r) => r.status === 'active' && r.isReported)) {
    const h = data.households.find((x) => x.id === record.householdId)
    if (!h) continue
    const arrears = getArrears(data, h.id)
    risks.push({
      id: `reported-${record.id}`,
      level: 'danger',
      text: `${h.householdNo} ${h.ownerName} 长期欠费 ${arrears.months} 个月,多次催缴无果,已标记上报`,
      link: `/property/households/${h.id}`,
    })
  }

  // 2. 超时工单
  const overdue = getOpenOverdueWorkOrders(data)
  if (overdue.length > 0) {
    const maxH = Math.max(...overdue.map((wo) => overdueHours(wo)))
    risks.push({
      id: 'overdue-wos',
      level: 'danger',
      text: `${overdue.length} 个工单超时未完工,最长已超时约 ${Math.round(maxH / 24)} 天,及时率受影响`,
      link: '/property/work-orders?overdue=1',
    })
  }

  // 3. 主管介入中的投诉
  const supervisorComplaints = data.complaints.filter((c) => deriveComplaintStatus(c) === 'supervisor')
  if (supervisorComplaints.length > 0) {
    risks.push({
      id: 'supervisor-complaints',
      level: 'warning',
      text: `${supervisorComplaints.length} 条投诉处于主管介入中,需尽快回复业主`,
      link: '/property/work-orders?tab=complaint',
    })
  }

  // 4. 数据待核实的欠费户(疑似空置)
  const rows = getDunningRows(data)
  const verifyCount = rows.filter((r) => r.suggestion === 'verify').length
  if (verifyCount > 0) {
    risks.push({
      id: 'verify-households',
      level: 'warning',
      text: `${verifyCount} 户欠费数据异常(疑似空置未登记),空置数据待校准`,
      link: '/property/dunning?filter=verify',
    })
  }

  // 5. 因服务问题暂缓催缴的户
  const holdCount = rows.filter((r) => r.suggestion === 'hold').length
  if (holdCount > 0) {
    risks.push({
      id: 'hold-households',
      level: 'info',
      text: `${holdCount} 户因服务问题暂缓催缴,先解决工单/投诉再催费`,
      link: '/property/dunning?filter=hold',
    })
  }

  // 6. 未闭环投诉总量提示
  const openComplaints = data.complaints.filter(isComplaintOpen)
  if (openComplaints.length > 0) {
    risks.push({
      id: 'open-complaints',
      level: 'info',
      text: `${openComplaints.length} 条投诉未闭环,请跟进处理`,
      link: '/property/work-orders?tab=complaint',
    })
  }

  return risks
}
