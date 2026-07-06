import { ArrowLeft, MessageSquareWarning, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusStepper } from '@/components/shared/StatusStepper'
import { Timeline } from '@/components/shared/Timeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { deriveWorkOrderStatus } from '@/data/selectors/workOrderSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import { formatDateTime } from '@/lib/format'
import { deptMap, getWoStatusMeta, workOrderCategoryMap, workOrderEventMap } from '@/lib/statusMaps'
import { SignatureDialog } from './SignatureDialog'

export function CompanyWorkOrderDetailPage() {
  const { id = '' } = useParams()
  const scoped = useScopedData()
  const rateWorkOrder = useAppStore((s) => s.rateWorkOrder)
  const workOrder = scoped.workOrders.find((w) => w.id === id)

  const [signOpen, setSignOpen] = useState(false)
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5)
  const [comment, setComment] = useState('')

  if (!workOrder) return <Navigate to="/company/work-orders" replace />

  const status = deriveWorkOrderStatus(workOrder)
  const staff = scoped.staff.find((s) => s.id === workOrder.assignedStaffId)

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/company/work-orders">
          <ArrowLeft /> 返回报事报修
        </Link>
      </Button>

      <Card className="py-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">{workOrder.id}</span>
            <StatusBadge meta={getWoStatusMeta(status, workOrder.kind)} />
            <OverdueBadge workOrder={workOrder} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <StatusStepper status={status} kind={workOrder.kind} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">报修类别</p>
              <p className="mt-0.5">{workOrderCategoryMap[workOrder.category]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">维修人员</p>
              <p className="mt-0.5">{staff ? `${staff.name}(${deptMap[staff.dept]})` : '待派单'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">预约处理时间</p>
              <p className="mt-0.5 tabular-nums">{formatDateTime(workOrder.appointmentAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">报修时间</p>
              <p className="mt-0.5 tabular-nums">{formatDateTime(workOrder.events[0]?.at)}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">问题描述</p>
            <p className="mt-1 rounded-md bg-muted/60 px-3 py-2 text-sm leading-relaxed">{workOrder.description}</p>
          </div>
          {workOrder.completionNote && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">完工说明</p>
              <p className="mt-1 rounded-md bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-800">
                {workOrder.completionNote}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 待签字:企业电子签字关单 */}
      {status === 'done_pending_sign' && (
        <Card className="border-violet-200 bg-violet-50/50 py-0">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">维修已完工,待贵司确认</p>
              <p className="mt-0.5 text-xs text-muted-foreground">确认无问题后由对接人电子签字,工单即关闭</p>
            </div>
            <Button onClick={() => setSignOpen(true)}>
              <PenLine /> 电子签字
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 已关单未评价:满意度评价 / 转投诉 */}
      {status === 'closed' && !workOrder.satisfactionRating && (
        <Card className="py-0">
          <CardHeader className="border-b py-3!">
            <CardTitle className="text-sm font-medium">服务评价</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">满意度</span>
              <StarRating value={rating} onChange={setRating} />
              <span className="text-sm text-muted-foreground">{rating} 星</span>
            </div>
            <Textarea
              rows={2}
              placeholder="说说本次维修体验(选填,将进入物业端满意度分析)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  rateWorkOrder(workOrder.id, rating, comment.trim() || undefined)
                  toast.success('感谢您的评价!已计入物业端满意度分析')
                }}
              >
                提交评价
              </Button>
              <Button asChild variant="outline">
                <Link to={`/company/complaints/new?workOrderId=${workOrder.id}`}>
                  <MessageSquareWarning /> 转投诉
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'closed' && workOrder.satisfactionRating && (
        <Card className="py-0">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">我司评价</span>
              <StarRating value={workOrder.satisfactionRating} />
              {workOrder.ratingComment && (
                <span className="text-sm text-muted-foreground">「{workOrder.ratingComment}」</span>
              )}
            </div>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to={`/company/complaints/new?workOrderId=${workOrder.id}`}>仍有问题?转投诉</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 时间线 */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">进度时间线</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Timeline
            entries={workOrder.events.map((e, i) => ({
              key: `${workOrder.id}-${i}`,
              title: workOrderEventMap[e.type],
              at: e.at,
              by: e.by,
              content: e.note,
            }))}
          />
        </CardContent>
      </Card>

      <SignatureDialog workOrder={workOrder} open={signOpen} onOpenChange={setSignOpen} />
    </div>
  )
}
