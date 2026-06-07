import type { Complaint, DunningRecord, ServiceTask, WorkOrder } from '../data/types'
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

export function nextDunningId(existing: DunningRecord[]): string {
  return nextSeq(existing.map((d) => d.id), 'DN-')
}

export function nextServiceTaskId(existing: ServiceTask[]): string {
  return nextSeq(existing.map((t) => t.id), 'ST-')
}

function maxSeq(ids: string[], prefix: string): number {
  return ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
}

function nextSeq(ids: string[], prefix: string): string {
  return `${prefix}${String(maxSeq(ids, prefix) + 1).padStart(3, '0')}`
}
