import { CURRENT_MONTH, DEMO_TODAY } from '../../lib/date'
import type { AppData, Bill, Company } from '../types'
import { getMonthCollection } from './billingSelectors'
import { complaintCreatedAt } from './complaintSelectors'
import type { ScopedInternal } from './scope'
import { deriveWorkOrderStatus, reportedAt } from './workOrderSelectors'

// ============================================================
// 日报:由当前角色可见数据实时生成(替代旧版手写文案)。
// 「今日系统动态」= 时间戳落在今天的 store 记录合成的条目流,
// 保留「原始信息 → AI 提炼」的产品叙事且与数字完全一致。
// ============================================================

const isToday = (iso?: string) => !!iso && iso.startsWith(DEMO_TODAY)

export interface DailyFeedEntry {
  id: string
  time: string // 'HH:mm'
  author: string
  channel: 'payment' | 'workOrder' | 'complaint' | 'maintenance' | 'inspection' | 'notice' | 'survey' | 'followUp'
  content: string
}

export interface PaydayHint {
  company: Company
  paid: boolean
}

export interface DailyReportData {
  date: string
  /** 今日收款 */
  payments: { count: number; amount: number; bills: Bill[] }
  /** 本月收缴率(今日动作后的实时值)与今日增量 */
  collection: { rate: number; received: number; receivable: number; todayAmount: number }
  workOrders: { created: number; closed: number; open: number }
  complaints: { created: number; closed: number; open: number }
  maintenance: { executedToday: number; overdue: number }
  inspections: { doneToday: number; pendingToday: number; abnormalItems: number }
  notices: { publishedToday: number; active: number }
  ratings: { count: number; avg: number | null }
  followUps: { createdToday: number; resolvedToday: number; active: number }
  paydayHints: PaydayHint[]
  surveysSubmittedToday: number
  feed: DailyFeedEntry[]
}

type ReportSlice = Pick<
  AppData,
  'bills' | 'companies' | 'workOrders' | 'complaints' | 'notices' | 'followUpRecords' | 'surveyResponses' | 'waivers'
>

const timeOf = (iso: string) => iso.slice(11, 16)

export function buildDailyReport(data: ReportSlice, internal: ScopedInternal): DailyReportData {
  const todayBills = data.bills.filter((b) => isToday(b.paidAt))
  const todayAmount = todayBills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
  const collection = getMonthCollection(data, CURRENT_MONTH)

  const createdWos = data.workOrders.filter((w) => isToday(reportedAt(w)))
  const closedWos = data.workOrders.filter((w) => isToday(w.events.find((e) => e.type === 'CLOSED')?.at))
  const openWos = data.workOrders.filter((w) => deriveWorkOrderStatus(w) !== 'closed')

  const createdComplaints = data.complaints.filter((c) => isToday(complaintCreatedAt(c)))
  const closedComplaints = data.complaints.filter((c) => isToday(c.events.find((e) => e.type === 'CLOSED')?.at))
  const openComplaints = data.complaints.filter((c) => c.events[c.events.length - 1]?.type !== 'CLOSED')

  const executedMaint = internal.maintenanceOrders.filter((m) => isToday(m.executedAt))
  const overdueMaint = internal.maintenanceOrders.filter((m) => !m.executedAt && m.plannedAt < `${DEMO_TODAY}T00:00:00`)

  const doneInspections = internal.inspections.filter((i) => isToday(i.executedAt))
  const pendingInspections = internal.inspections.filter((i) => i.plannedAt.startsWith(DEMO_TODAY) && !i.executedAt)
  const abnormalToday = internal.inspections
    .filter((i) => isToday(i.executedAt))
    .reduce((s, i) => s + i.items.filter((x) => !x.ok).length, 0)

  const publishedNotices = data.notices.filter((n) => isToday(n.publishedAt))
  const activeNotices = data.notices.filter((n) => !n.revokedAt && n.endAt >= `${DEMO_TODAY}T00:00:00`)

  const todayRatings = data.workOrders.filter((w) => isToday(w.events.find((e) => e.type === 'RATED')?.at))
  const ratingAvg =
    todayRatings.length === 0
      ? null
      : todayRatings.reduce((s, w) => s + (w.satisfactionRating ?? 0), 0) / todayRatings.length

  const fuCreated = data.followUpRecords.filter((r) => isToday(r.createdAt))
  const fuResolved = data.followUpRecords.filter((r) => isToday(r.resolvedAt))
  const fuActive = data.followUpRecords.filter((r) => r.status === 'active')

  const todayDay = Number(DEMO_TODAY.slice(8, 10))
  const paydayHints: PaydayHint[] = data.companies
    .filter((c) => c.paymentHabit?.payDay === todayDay)
    .map((company) => ({
      company,
      paid: data.bills
        .filter((b) => b.companyId === company.id && b.month === CURRENT_MONTH)
        .every((b) => b.paidAmount >= b.amount),
    }))

  const surveysToday = data.surveyResponses.filter((r) => isToday(r.submittedAt))

  // ===== 今日系统动态(原始条目流,倒序)=====
  const feed: DailyFeedEntry[] = []
  const companyName = (id?: string) => data.companies.find((c) => c.id === id)?.name ?? '园区'
  for (const b of todayBills) {
    feed.push({
      id: `f-pay-${b.id}`,
      time: timeOf(b.paidAt!),
      author: b.companyId ? companyName(b.companyId) : '园区临停',
      channel: 'payment',
      content: `${b.companyId ? companyName(b.companyId) : '园区临时停放'} ${b.month} 月账单到账 ¥${Math.min(b.paidAmount, b.amount).toLocaleString()}`,
    })
  }
  for (const w of data.workOrders) {
    for (const e of w.events) {
      if (!isToday(e.at)) continue
      feed.push({
        id: `f-wo-${w.id}-${e.type}-${e.at}`,
        time: timeOf(e.at),
        author: e.by,
        channel: 'workOrder',
        content: `${w.id} ${e.note ?? e.type}`,
      })
    }
  }
  for (const c of data.complaints) {
    for (const e of c.events) {
      if (!isToday(e.at)) continue
      feed.push({
        id: `f-cp-${c.id}-${e.type}-${e.at}`,
        time: timeOf(e.at),
        author: e.by,
        channel: 'complaint',
        content: `${c.id} ${e.content ?? e.type}`,
      })
    }
  }
  for (const m of executedMaint) {
    feed.push({
      id: `f-mo-${m.id}`,
      time: timeOf(m.executedAt!),
      author: m.executantName,
      channel: 'maintenance',
      content: `维保完成:${m.title}(${m.location})`,
    })
  }
  for (const i of doneInspections) {
    const abnormal = i.items.filter((x) => !x.ok).length
    feed.push({
      id: `f-is-${i.id}`,
      time: timeOf(i.executedAt!),
      author: i.inspectorName,
      channel: 'inspection',
      content: `巡检完成:${i.areaLabel}${abnormal > 0 ? `,发现 ${abnormal} 项异常` : ',全部合格'}`,
    })
  }
  for (const n of publishedNotices) {
    feed.push({
      id: `f-nt-${n.id}`,
      time: timeOf(n.publishedAt),
      author: n.publishedBy,
      channel: 'notice',
      content: `发布通知:${n.title}`,
    })
  }
  for (const r of surveysToday) {
    feed.push({
      id: `f-sr-${r.id}`,
      time: timeOf(r.submittedAt),
      author: companyName(r.companyId),
      channel: 'survey',
      content: `${companyName(r.companyId)} 提交满意度调研问卷`,
    })
  }
  for (const r of fuCreated) {
    feed.push({
      id: `f-fu-${r.id}`,
      time: timeOf(r.createdAt),
      author: r.byUsername,
      channel: 'followUp',
      content: `对 ${companyName(r.companyId)} 发起收款跟进(欠费 ¥${r.arrearsAmountSnapshot.toLocaleString()})`,
    })
  }
  feed.sort((a, b) => b.time.localeCompare(a.time))

  return {
    date: DEMO_TODAY,
    payments: { count: todayBills.length, amount: todayAmount, bills: todayBills },
    collection: { rate: collection.rate, received: collection.received, receivable: collection.receivable, todayAmount },
    workOrders: { created: createdWos.length, closed: closedWos.length, open: openWos.length },
    complaints: { created: createdComplaints.length, closed: closedComplaints.length, open: openComplaints.length },
    maintenance: { executedToday: executedMaint.length, overdue: overdueMaint.length },
    inspections: { doneToday: doneInspections.length, pendingToday: pendingInspections.length, abnormalItems: abnormalToday },
    notices: { publishedToday: publishedNotices.length, active: activeNotices.length },
    ratings: { count: todayRatings.length, avg: ratingAvg },
    followUps: { createdToday: fuCreated.length, resolvedToday: fuResolved.length, active: fuActive.length },
    paydayHints,
    surveysSubmittedToday: surveysToday.length,
    feed,
  }
}
