import { DEMO_TODAY } from '../../lib/date'
import { paymentMethodMap } from '../../lib/statusMaps'
import type { AppData, Company, FollowUpRecord, FollowUpSuggestion, Waiver } from '../types'
import { getArrears, getCompanyWaivers, type Arrears } from './billingSelectors'
import { getCompanyComplaints, isComplaintOpen } from './complaintSelectors'
import { getCompanyWorkOrders, isWorkOrderOverdue } from './workOrderSelectors'

// ============================================================
// 收款跟进(原催缴弱化改造)。
// 前置判断三依据并列:缴费习惯 / 报事报修关单情况 / 投诉关单情况。
// 三色(实时派生、发起跟进时快照):
//   1. 有未闭环投诉 或 超时未完工工单        → hold    🟠 暂缓跟进
//   2. 欠费仅当月且未到习惯付款日 / 无习惯记录 → pending ⚪️ 暂不跟进 · 待沟通核实
//   3. 否则                                  → collect 🟢 建议跟进
// ============================================================

type FollowUpSlice = Pick<AppData, 'bills' | 'workOrders' | 'complaints' | 'companies' | 'waivers' | 'followUpRecords'>

const TODAY_DAY = Number(DEMO_TODAY.slice(8, 10))

export function getFollowUpSuggestion(data: FollowUpSlice, companyId: string): FollowUpSuggestion {
  const openComplaints = getCompanyComplaints(data, companyId).filter(isComplaintOpen)
  const overdueWos = getCompanyWorkOrders(data, companyId).filter((wo) => isWorkOrderOverdue(wo))
  if (openComplaints.length > 0 || overdueWos.length > 0) return 'hold'

  const arrears = getArrears(data, companyId)
  const onlyCurrentMonth = arrears.months === 1 && arrears.bills.every((b) => b.month === DEMO_TODAY.slice(0, 7))
  if (onlyCurrentMonth) {
    const habit = data.companies.find((c) => c.id === companyId)?.paymentHabit
    if (!habit) return 'pending' // 无习惯记录 → 待沟通核实
    if (TODAY_DAY <= habit.payDay) return 'pending' // 未到付款日 → 暂不跟进
  }
  return 'collect'
}

export interface FollowUpReason {
  /** 三依据:habit 缴费习惯 / workOrder 报修关单 / complaint 投诉关单 */
  key: 'habit' | 'workOrder' | 'complaint'
  label: string
  /** true = 该依据阻断/延缓跟进 */
  hit: boolean
  text: string
}

/** 三依据并列展示(§4.2.5):每条给出结论文案,hit 表示阻断项 */
export function getFollowUpReasons(data: FollowUpSlice, companyId: string): FollowUpReason[] {
  const company = data.companies.find((c) => c.id === companyId)
  const arrears = getArrears(data, companyId)
  const openComplaints = getCompanyComplaints(data, companyId).filter(isComplaintOpen)
  const overdueWos = getCompanyWorkOrders(data, companyId).filter((wo) => isWorkOrderOverdue(wo))
  const onlyCurrentMonth = arrears.months === 1 && arrears.bills.every((b) => b.month === DEMO_TODAY.slice(0, 7))

  let habitHit = false
  let habitText: string
  const habit = company?.paymentHabit
  if (!habit) {
    habitHit = true
    habitText = '无缴费习惯记录,建议先与企业沟通核实付款安排'
  } else {
    const habitDesc = `习惯每月 ${habit.payDay} 日${paymentMethodMap[habit.method]}`
    if (onlyCurrentMonth && TODAY_DAY <= habit.payDay) {
      habitHit = true
      habitText = `${habitDesc},未到付款日 → 暂不跟进`
    } else if (arrears.amount > 0) {
      habitText = `${habitDesc},已过付款日仍未缴清 → 可按习惯渠道跟进`
    } else {
      habitText = `${habitDesc},历史均按时缴清`
    }
  }

  return [
    { key: 'habit', label: '缴费习惯', hit: habitHit, text: habitText },
    {
      key: 'workOrder',
      label: '报事报修关单情况',
      hit: overdueWos.length > 0,
      text:
        overdueWos.length > 0
          ? `存在 ${overdueWos.length} 张超时未闭环工单(${overdueWos.map((w) => w.id).join('、')})→ 先解决服务问题,暂缓跟进`
          : '无超时未闭环工单',
    },
    {
      key: 'complaint',
      label: '投诉关单情况',
      hit: openComplaints.length > 0,
      text:
        openComplaints.length > 0
          ? `存在 ${openComplaints.length} 条未闭环投诉(${openComplaints.map((c) => c.id).join('、')})→ 先闭环投诉,暂缓跟进`
          : '无未闭环投诉',
    },
  ]
}

export interface FollowUpRow {
  company: Company
  arrears: Arrears
  suggestion: FollowUpSuggestion
  reasons: FollowUpReason[]
  waivers: Waiver[]
  activeRecord?: FollowUpRecord
}

const SUGGESTION_ORDER: Record<FollowUpSuggestion, number> = { collect: 0, hold: 1, pending: 2 }

/** 全部未缴清企业的跟进行(建议跟进 → 暂缓 → 暂不跟进,同档按欠费金额降序) */
export function getFollowUpRows(data: FollowUpSlice): FollowUpRow[] {
  return data.companies
    .map((company) => ({ company, arrears: getArrears(data, company.id) }))
    .filter((r) => r.arrears.amount > 0)
    .map((r) => ({
      ...r,
      suggestion: getFollowUpSuggestion(data, r.company.id),
      reasons: getFollowUpReasons(data, r.company.id),
      waivers: getCompanyWaivers(data, r.company.id),
      activeRecord: data.followUpRecords.find((x) => x.companyId === r.company.id && x.status === 'active'),
    }))
    .sort(
      (a, b) =>
        SUGGESTION_ORDER[a.suggestion] - SUGGESTION_ORDER[b.suggestion] || b.arrears.amount - a.arrears.amount,
    )
}

export function getActiveFollowUpForCompany(data: Pick<AppData, 'followUpRecords'>, companyId: string) {
  return data.followUpRecords.find((r) => r.companyId === companyId && r.status === 'active')
}
