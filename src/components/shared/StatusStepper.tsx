import { Check } from 'lucide-react'
import type { WorkOrderStatus } from '@/data/types'
import { cn } from '@/lib/utils'

const STEPS = ['报修', '接单', '派单', '预约', '完工', '签字', '关单']

/** 当前状态 → 已完成的最后一步下标 */
const STATUS_STEP: Record<WorkOrderStatus, number> = {
  pending: 0,
  accepted: 1,
  dispatched: 2,
  in_progress: 3,
  done_pending_sign: 4,
  closed: 6,
}

/** 工单横向步骤条:报修 → 接单 → 派单 → 预约 → 完工 → 签字 → 关单 */
export function StatusStepper({ status }: { status: WorkOrderStatus }) {
  const current = STATUS_STEP[status]
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i <= current
        const isCurrent = i === current && status !== 'closed'
        return (
          <div key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-muted-foreground',
                  isCurrent && 'ring-4 ring-primary/15',
                )}
              >
                {done && !isCurrent ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn('text-xs whitespace-nowrap', done ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-1 mb-5 h-px flex-1', i < current ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
