import { Calendar, CalendarClock, CalendarDays, ChevronRight, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/data/store'
import {
  deriveTaskStatus,
  getLevelStats,
  getRootTasks,
  getTaskChildren,
} from '@/data/selectors/taskSelectors'
import { useScopedInternal } from '@/hooks/useScopedData'
import { formatPercent } from '@/lib/format'
import { taskLevelMap, taskStatusMap } from '@/lib/statusMaps'
import type { TaskLevel, WorkTask } from '@/data/types'

const LEVEL_ICONS: Record<TaskLevel, typeof Target> = {
  year: Target,
  quarter: Calendar,
  month: CalendarDays,
  week: CalendarClock,
}

const LEVELS: TaskLevel[] = ['year', 'quarter', 'month', 'week']

/** 递归任务节点:年 → 季 → 月 → 周 四级穿透 */
function TaskNode({
  task,
  allTasks,
  owners,
  depth,
  defaultOpen = false,
}: {
  task: WorkTask
  allTasks: WorkTask[]
  owners: Record<string, string>
  depth: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const completeTask = useAppStore((s) => s.completeTask)
  const children = getTaskChildren(allTasks, task.id)
  const status = deriveTaskStatus(task)

  const handleComplete = () => {
    completeTask(task.id)
    toast.success('任务已完成,各层级达成率实时更新')
  }

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2 border-b py-2 pr-2 text-sm last:border-b-0"
        style={{ paddingLeft: depth * 22 }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-accent"
            aria-label={open ? '收起' : '展开下钻'}
          >
            <ChevronRight className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}
        <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
          {taskLevelMap[task.level]}
        </Badge>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{task.periodLabel}</span>
        <span className="min-w-0 flex-1 font-medium">{task.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{owners[task.ownerUsername] ?? task.ownerUsername}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">截止 {task.dueAt}</span>
        <StatusBadge meta={taskStatusMap[status]} />
        {status === 'done' && task.completedAt ? (
          <span className="shrink-0 text-xs text-muted-foreground">{task.completedAt} 完成</span>
        ) : (
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={handleComplete}>
            标记完成
          </Button>
        )}
      </div>
      {open && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TaskNode key={child.id} task={child} allTasks={allTasks} owners={owners} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TasksPage() {
  const internal = useScopedInternal()
  const tasks = internal.workTasks
  const accounts = useAppStore((s) => s.accounts)

  const owners = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.username, a.displayName])),
    [accounts],
  )
  const roots = useMemo(() => getRootTasks(tasks), [tasks])
  const levelStats = useMemo(() => LEVELS.map((level) => getLevelStats(tasks, level)), [tasks])

  return (
    <div className="space-y-4">
      <PageHeader
        title="工作任务清单"
        description="制式任务表单 · 年度目标 → 季度拆解 → 月度任务 → 周任务穿透下钻 · 主管见全部,客服仅见自己的任务"
      />

      {/* ===== 四级达成率与及时性 ===== */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {levelStats.map((stats) => (
          <KpiCard
            key={stats.level}
            title={`${taskLevelMap[stats.level]}任务达成率`}
            value={formatPercent(stats.rate, 0)}
            icon={LEVEL_ICONS[stats.level]}
            alert={stats.overdue > 0}
            alertText={stats.overdue > 0 ? `逾期 ${stats.overdue} 项` : undefined}
            sub={`已完成 ${stats.done}/${stats.total} · 及时率 ${formatPercent(stats.onTimeRate, 0)}`}
          />
        ))}
      </div>

      {/* ===== 年度任务树(点击箭头逐级下钻)===== */}
      {roots.length === 0 ? (
        <EmptyState title="暂无任务" description="当前账号名下没有分派的任务" />
      ) : (
        <div className="space-y-3">
          {roots.map((root) => (
            <Card key={root.id} className="py-0">
              <CardContent className="px-3 py-1">
                <TaskNode task={root} allTasks={tasks} owners={owners} depth={0} defaultOpen />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        点击行首箭头逐级下钻:年度目标 → 季度拆解 → 月度任务 → 周任务;标记完成后,上方各层级达成率与驾驶舱数字实时联动。
      </p>
    </div>
  )
}
