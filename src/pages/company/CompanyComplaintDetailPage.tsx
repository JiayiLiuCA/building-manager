import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timeline } from '@/components/shared/Timeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { deriveComplaintStatus } from '@/data/selectors/complaintSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import { complaintEventMap, complaintStatusMap, deptMap } from '@/lib/statusMaps'

export function CompanyComplaintDetailPage() {
  const { id = '' } = useParams()
  const scoped = useScopedData()
  const closeComplaint = useAppStore((s) => s.closeComplaint)
  const requestSupervisor = useAppStore((s) => s.requestSupervisor)
  const complaint = scoped.complaints.find((c) => c.id === id)

  const [escalateOpen, setEscalateOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (!complaint) return <Navigate to="/company/work-orders?tab=complaint" replace />

  const status = deriveComplaintStatus(complaint)

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/company/work-orders?tab=complaint">
          <ArrowLeft /> 返回投诉列表
        </Link>
      </Button>

      <Card className="py-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">{complaint.id}</span>
            <StatusBadge meta={complaintStatusMap[status]} />
            {complaint.responsibleDept && (
              <span className="text-xs text-muted-foreground">责任部门:{deptMap[complaint.responsibleDept]}</span>
            )}
          </div>
          <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-sm leading-relaxed">{complaint.content}</p>
          {complaint.workOrderId && (
            <p className="mt-2 text-xs text-muted-foreground">
              关联工单:
              <Link to={`/company/work-orders/${complaint.workOrderId}`} className="font-mono text-primary hover:underline">
                {complaint.workOrderId}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* 已回复:满意关闭 / 申请主管介入 */}
      {status === 'replied' && (
        <Card className="border-violet-200 bg-violet-50/50 py-0">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">物业已回复,贵司对处理结果满意吗?</p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  closeComplaint(complaint.id)
                  toast.success('感谢反馈,投诉已关闭')
                }}
              >
                满意,关闭投诉
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEscalateOpen(true)}>
                <ShieldAlert /> 不满意,申请主管介入
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'supervisor' && (
        <Card className="border-red-200 bg-red-50/50 py-0">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-700">主管已介入处理</p>
            <p className="mt-1 text-xs text-red-600/80">贵司的诉求已升级,主管将尽快复核并回复</p>
          </CardContent>
        </Card>
      )}

      {/* 处理进度时间线 */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">处理进度</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Timeline
            entries={complaint.events.map((e, i) => ({
              key: `${complaint.id}-${i}`,
              title: e.dept ? `${complaintEventMap[e.type]}(${deptMap[e.dept]})` : complaintEventMap[e.type],
              at: e.at,
              by: e.by,
              content: e.content,
            }))}
          />
        </CardContent>
      </Card>

      {/* 主管介入弹窗 */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>申请主管介入</DialogTitle>
            <DialogDescription>请说明贵司对当前处理结果不满意的原因,主管将复核并回复</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="如:回复后问题依旧存在,已影响正常经营"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!reason.trim()}
              onClick={() => {
                requestSupervisor(complaint.id, reason.trim())
                setEscalateOpen(false)
                setReason('')
                toast.success('已申请主管介入,主管将尽快回复')
              }}
            >
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
