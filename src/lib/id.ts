import type {
  Complaint,
  FollowUpRecord,
  Invoice,
  LockAssignment,
  LockPasscode,
  Notice,
  Survey,
  UnlockRecord,
  WorkOrder,
} from '../data/types'
import { DEMO_TODAY } from './date'

// 运行时新建实体的 ID 生成:扫描现有数组取最大序号 +1,保证人类可读且不重复

/** 工单号按日期编号:WO-20260606-003 */
export function nextWorkOrderId(existing: WorkOrder[]): string {
  const prefix = `WO-${DEMO_TODAY.replaceAll('-', '')}-`
  const max = maxSeq(existing.map((w) => w.id), prefix)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export function nextComplaintId(existing: Complaint[]): string {
  return nextSeq(existing.map((c) => c.id), 'CP-')
}

export function nextFollowUpId(existing: FollowUpRecord[]): string {
  return nextSeq(existing.map((r) => r.id), 'FU-')
}

export function nextNoticeId(existing: Notice[]): string {
  return nextSeq(existing.map((n) => n.id), 'NT-')
}

export function nextInvoiceId(existing: Invoice[]): string {
  return nextSeq(existing.map((i) => i.id), 'IV-')
}

export function nextSurveyId(existing: Survey[]): string {
  return nextSeq(existing.map((s) => s.id), 'SR-', 2)
}

function maxSeq(ids: string[], prefix: string): number {
  return ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
}

export function nextLockAssignmentId(existing: LockAssignment[]): string {
  return nextSeq(existing.map((a) => a.id), 'LA-')
}

export function nextPasscodeId(existing: LockPasscode[]): string {
  return nextSeq(existing.map((p) => p.id), 'PC-', 4)
}

export function nextUnlockRecordId(existing: UnlockRecord[]): string {
  return nextSeq(existing.map((r) => r.id), 'UR-', 5)
}

function nextSeq(ids: string[], prefix: string, pad = 3): string {
  return `${prefix}${String(maxSeq(ids, prefix) + 1).padStart(pad, '0')}`
}
