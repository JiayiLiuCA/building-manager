import { Check } from 'lucide-react'
import type { WorkOrderKind, WorkOrderStatus } from '@/data/types'
import { cn } from '@/lib/utils'

/** 企业报事报修:报修 → 接单 → 派单 → 预约 → 完工 → 签字 → 关单 */
const COMPANY_STEPS = ['报修', '接单', '派单', '预约', '完工', '签字', '关单']
/** 公共区域维修:无签字主体,完工后物业验收关单 */
const PUBLIC_STEPS = ['登记', '接单', '派单', '预约', '完工', '验收关单']

const COMPANY_STATUS_STEP: Record<WorkOrderStatus, number> = {
  pending: 0,
  accepted: 1,
  dispatched: 2,
  in_progress: 3,
  done_pending_sign: 4,
  closed: 6,
}

const PUBLIC_STATUS_STEP: Record<WorkOrderStatus, number> = {
  pending: 0,
  accepted: 1,
  dispatched: 2,
  in_progress: 3,
  done_pending_sign: 4,
  closed: 5,
}

/** 工单横向步骤条(按工单类型切换步序) */
export function StatusStepper({ status, kind = 'company' }: { status: WorkOrderStatus; kind?: WorkOrderKind }) {
  const steps = kind === 'public' ? PUBLIC_STEPS : COMPANY_STEPS
  const current = (kind === 'public' ? PUBLIC_STATUS_STEP : COMPANY_STATUS_STEP)[status]
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const done = i <= current
        const isCurrent = i === current && status !== 'closed'
        return (
          <div key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
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
            {i < steps.length - 1 && (
              <div className={cn('mx-1 mb-5 h-px flex-1', i < current ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
