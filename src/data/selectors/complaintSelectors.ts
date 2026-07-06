import { demoNow } from '../../lib/date'
import type { AppData, Complaint, ComplaintEventType, ComplaintStatus } from '../types'

const STATUS_EVENT: Record<ComplaintEventType, ComplaintStatus> = {
  CREATED: 'pending',
  DISPATCHED: 'processing',
  REPLIED: 'replied',
  SUPERVISOR_REQUESTED: 'supervisor',
  SUPERVISOR_REPLIED: 'replied',
  CLOSED: 'closed',
}

export function deriveComplaintStatus(c: Complaint): ComplaintStatus {
  const last = c.events[c.events.length - 1]
  return last ? STATUS_EVENT[last.type] : 'pending'
}

export function complaintCreatedAt(c: Complaint): string {
  return c.events[0]?.at ?? demoNow()
}

export function isComplaintOpen(c: Complaint): boolean {
  return deriveComplaintStatus(c) !== 'closed'
}

export function isSupervisorInvolved(c: Complaint): boolean {
  return c.events.some((e) => e.type === 'SUPERVISOR_REQUESTED' || e.type === 'SUPERVISOR_REPLIED')
}

type ComplaintSlice = Pick<AppData, 'complaints'>

export function getCompanyComplaints(data: ComplaintSlice, companyId: string): Complaint[] {
  return data.complaints
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => complaintCreatedAt(b).localeCompare(complaintCreatedAt(a)))
}

/** 反复投诉:历史投诉 ≥ 3 条 */
export function isRepeatComplainer(data: ComplaintSlice, companyId: string): boolean {
  return data.complaints.filter((c) => c.companyId === companyId).length >= 3
}

/** 投诉一次性解决率:未升级主管即关闭 / 全部已关闭 */
export function getComplaintSatisfactionRate(data: ComplaintSlice): number {
  const closed = data.complaints.filter((c) => deriveComplaintStatus(c) === 'closed')
  if (closed.length === 0) return 1
  return closed.filter((c) => !isSupervisorInvolved(c)).length / closed.length
}
