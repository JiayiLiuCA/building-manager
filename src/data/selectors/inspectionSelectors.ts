import { demoNow, diffHours } from '../../lib/date'
import type { Inspection, InspectionTemplateKey } from '../types'

// ============================================================
// 巡检口径:
// - 状态派生:执行且全部合格 pass / 执行且有异常项 abnormal /
//             未执行且未到计划时间 pending / 计划已过未执行 overdue
// - 完成率 = 已执行 / 应执行(计划 ≤ 现在);及时率 = 2h 内开检 / 已执行
// ============================================================

export type InspectionStatus = 'pass' | 'abnormal' | 'pending' | 'overdue'

export function deriveInspectionStatus(inspection: Inspection, now = demoNow()): InspectionStatus {
  if (inspection.executedAt) {
    return inspection.items.every((i) => i.ok) ? 'pass' : 'abnormal'
  }
  return inspection.plannedAt <= now ? 'overdue' : 'pending'
}

export function isInspectionOnTime(inspection: Inspection): boolean {
  if (!inspection.executedAt) return false
  return diffHours(inspection.plannedAt, inspection.executedAt) <= 2
}

export interface InspectionStats {
  total: number
  executed: number
  due: number
  completionRate: number
  onTimeRate: number
  abnormalItemCount: number
  abnormalRecordCount: number
}

export function getInspectionStats(inspections: Inspection[], now = demoNow()): InspectionStats {
  const executed = inspections.filter((i) => i.executedAt).length
  const due = inspections.filter((i) => i.plannedAt <= now).length
  const onTime = inspections.filter(isInspectionOnTime).length
  const abnormalRecords = inspections.filter((i) => deriveInspectionStatus(i, now) === 'abnormal')
  return {
    total: inspections.length,
    executed,
    due,
    completionRate: due === 0 ? 1 : Math.min(1, executed / due),
    onTimeRate: executed === 0 ? 1 : onTime / executed,
    abnormalItemCount: inspections.reduce((s, i) => s + i.items.filter((x) => !x.ok).length, 0),
    abnormalRecordCount: abnormalRecords.length,
  }
}

/** 近 n 天巡检(按计划时间倒序) */
export function getRecentInspections(inspections: Inspection[], sinceIso: string): Inspection[] {
  return inspections
    .filter((i) => i.plannedAt >= sinceIso)
    .sort((a, b) => b.plannedAt.localeCompare(a.plannedAt))
}

export function getTemplateDist(inspections: Inspection[]): { templateKey: InspectionTemplateKey; count: number }[] {
  const map = new Map<InspectionTemplateKey, number>()
  for (const i of inspections) map.set(i.templateKey, (map.get(i.templateKey) ?? 0) + 1)
  return [...map.entries()].map(([templateKey, count]) => ({ templateKey, count }))
}
