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

/** 是否曾升级到主管(无论当前状态) */
export function isSupervisorInvolved(c: Complaint): boolean {
  return c.events.some((e) => e.type === 'SUPERVISOR_REQUESTED' || e.type === 'SUPERVISOR_REPLIED')
}

export function getHouseholdComplaints(data: Pick<AppData, 'complaints'>, householdId: string): Complaint[] {
  return data.complaints
    .filter((c) => c.householdId === householdId)
    .sort((a, b) => complaintCreatedAt(b).localeCompare(complaintCreatedAt(a)))
}

/** 反复投诉户:历史投诉 ≥ 3 条 */
export function isRepeatComplainer(data: Pick<AppData, 'complaints'>, householdId: string): boolean {
  return data.complaints.filter((c) => c.householdId === householdId).length >= 3
}

/** 投诉满意率 = 未升级主管即关闭的投诉 / 已关闭投诉(一次性解决率) */
export function getComplaintSatisfactionRate(data: Pick<AppData, 'complaints'>): number {
  const closed = data.complaints.filter((c) => !isComplaintOpen(c))
  if (closed.length === 0) return 1
  const satisfied = closed.filter((c) => !isSupervisorInvolved(c)).length
  return satisfied / closed.length
}
