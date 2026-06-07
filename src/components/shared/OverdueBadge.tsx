import { AlarmClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { isWorkOrderOverdue, overdueHours } from '@/data/selectors/workOrderSelectors'
import type { WorkOrder } from '@/data/types'

function formatOverdue(hours: number): string {
  return hours >= 24 ? `${Math.floor(hours / 24)} 天` : `${hours} 小时`
}

/** 超时工单红色标记(自行派生,未超时不渲染) */
export function OverdueBadge({ workOrder }: { workOrder: WorkOrder }) {
  if (!isWorkOrderOverdue(workOrder)) return null
  return (
    <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 font-normal text-red-700">
      <AlarmClock className="size-3" />
      超时 {formatOverdue(overdueHours(workOrder))}
    </Badge>
  )
}
