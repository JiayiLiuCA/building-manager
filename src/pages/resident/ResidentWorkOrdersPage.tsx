import { ChevronRight, Plus, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { deriveWorkOrderStatus, getHouseholdWorkOrders, reportedAt } from '@/data/selectors/workOrderSelectors'
import { useAppStore } from '@/data/store'
import { formatDateTime } from '@/lib/format'
import { workOrderCategoryMap, workOrderStatusMap } from '@/lib/statusMaps'

export function ResidentWorkOrdersPage() {
  const navigate = useNavigate()
  const state = useAppStore()
  const householdId = state.currentUser?.householdId ?? ''
  const workOrders = useMemo(() => getHouseholdWorkOrders(state, householdId), [state, householdId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">报修 / 工单</h1>
          <p className="text-xs text-muted-foreground">报修后可随时查看派单与维修进度</p>
        </div>
        <Button asChild>
          <Link to="/resident/work-orders/new">
            <Plus /> 发起报修
          </Link>
        </Button>
      </div>

      {workOrders.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="暂无报修记录"
          description="家里有东西需要维修?点击右上角发起报修"
          action={
            <Button asChild size="sm">
              <Link to="/resident/work-orders/new">发起报修</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo) => {
            const status = deriveWorkOrderStatus(wo)
            return (
              <Card
                key={wo.id}
                className="cursor-pointer py-0 transition-shadow hover:shadow-md"
                onClick={() => navigate(`/resident/work-orders/${wo.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{wo.id}</span>
                      <StatusBadge meta={workOrderStatusMap[status]} />
                      <OverdueBadge workOrder={wo} />
                      {status === 'done_pending_sign' && (
                        <Badge className="bg-violet-600 text-white">待您签字</Badge>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {workOrderCategoryMap[wo.category]} · {wo.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>报修 {formatDateTime(reportedAt(wo))}</span>
                    {wo.appointmentAt && <span>预约 {formatDateTime(wo.appointmentAt)}</span>}
                    {wo.satisfactionRating && (
                      <span className="flex items-center gap-1">
                        已评价 <StarRating value={wo.satisfactionRating} />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
