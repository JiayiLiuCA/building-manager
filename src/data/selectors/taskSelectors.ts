import { DEMO_TODAY } from '../../lib/date'
import type { TaskLevel, WorkTask } from '../types'

// ============================================================
// 工作任务清单口径(年/季/月/周四级穿透):
// - 状态派生:done / overdue(open 且已过 dueAt)/ open
// - 达成率 = 已完成 / 全部;及时率 = 按期完成(completedAt ≤ dueAt)/ 已完成
// - 到期达成率 = 已完成 / 应完成(dueAt ≤ 今天),用于「当期」口径
// ============================================================

export type TaskStatus = 'done' | 'open' | 'overdue'

export function deriveTaskStatus(task: WorkTask, today = DEMO_TODAY): TaskStatus {
  if (task.status === 'done') return 'done'
  return task.dueAt < today ? 'overdue' : 'open'
}

export function getTaskChildren(tasks: WorkTask[], parentId: string): WorkTask[] {
  return tasks.filter((t) => t.parentId === parentId).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

export function getRootTasks(tasks: WorkTask[]): WorkTask[] {
  return tasks.filter((t) => t.level === 'year').sort((a, b) => a.id.localeCompare(b.id))
}

/** 周任务 → 年根任务的穿透链(面包屑用) */
export function getTaskTrail(tasks: WorkTask[], taskId: string): WorkTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const trail: WorkTask[] = []
  let cur = byId.get(taskId)
  let hops = 0
  while (cur && hops < 6) {
    trail.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
    hops += 1
  }
  return trail
}

export interface TaskLevelStats {
  level: TaskLevel
  total: number
  done: number
  /** 达成率 = done / total */
  rate: number
  /** 应完成(dueAt ≤ 今天)数与到期达成率 */
  due: number
  dueDone: number
  dueRate: number
  /** 及时率 = 按期完成 / 已完成 */
  onTimeRate: number
  overdue: number
}

export function getLevelStats(tasks: WorkTask[], level: TaskLevel, today = DEMO_TODAY): TaskLevelStats {
  const list = tasks.filter((t) => t.level === level)
  const done = list.filter((t) => t.status === 'done')
  const due = list.filter((t) => t.dueAt <= today)
  const dueDone = due.filter((t) => t.status === 'done')
  const onTime = done.filter((t) => t.completedAt != null && t.completedAt <= t.dueAt)
  return {
    level,
    total: list.length,
    done: done.length,
    rate: list.length === 0 ? 1 : done.length / list.length,
    due: due.length,
    dueDone: dueDone.length,
    dueRate: due.length === 0 ? 1 : dueDone.length / due.length,
    onTimeRate: done.length === 0 ? 1 : onTime.length / done.length,
    overdue: list.filter((t) => deriveTaskStatus(t, today) === 'overdue').length,
  }
}
