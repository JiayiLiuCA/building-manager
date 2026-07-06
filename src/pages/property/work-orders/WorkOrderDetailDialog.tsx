import { Megaphone } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusStepper } from '@/components/shared/StatusStepper'
import { Timeline } from '@/components/shared/Timeline'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { deriveWorkOrderStatus, reportedAt } from '@/data/selectors/workOrderSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { DeptCode, WorkOrder } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { deptMap, getWoStatusMeta, workOrderCategoryMap, workOrderEventMap, workOrderKindMap } from '@/lib/statusMaps'

interface Props {
  workOrder?: WorkOrder
  onClose: () => void
}

/**
 * 工单详情 Modal(全局挂载于 PropertyLayout,由 ?detail=WO-xxx 驱动):
 * 顶部流程进度 → 左栏 基本信息 / 工单内容 / 评价 / 下一步操作 → 右栏 处理时间线
 */
export function WorkOrderDetailDialog({ workOrder, onClose }: Props) {
  return (
    <Dialog open={!!workOrder} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-4xl">
        {workOrder && <DetailBody workOrder={workOrder} />}
      </DialogContent>
    </Dialog>
  )
}

function DetailBody({ workOrder }: { workOrder: WorkOrder }) {
  const scoped = useScopedData()
  const navigate = useNavigate()
  const status = deriveWorkOrderStatus(workOrder)
  const company = scoped.companies.find((c) => c.id === workOrder.companyId)
  const staff = scoped.staff.find((s) => s.id === workOrder.assignedStaffId)
  const isPublic = workOrder.kind === 'public'

  return (
    <>
      <DialogHeader className="border-b px-6 pt-5 pb-4 text-left">
        <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="font-mono">{workOrder.id}</span>
          <StatusBadge meta={workOrderKindMap[workOrder.kind]} />
          <StatusBadge meta={getWoStatusMeta(status, workOrder.kind)} />
          <OverdueBadge workOrder={workOrder} />
          {isPublic && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 gap-1 text-xs"
              onClick={() => navigate(`/property/notices?new=1&fromWorkOrder=${workOrder.id}`)}
            >
              <Megaphone className="size-3.5" /> 生成关联通知
            </Button>
          )}
        </DialogTitle>
        <DialogDescription>
          {workOrderCategoryMap[workOrder.category]} · {isPublic ? workOrder.location?.label : company?.name} · 报修于{' '}
          {formatDateTime(reportedAt(workOrder))}
        </DialogDescription>
      </DialogHeader>

      {/* 流程进度 */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <StatusStepper status={status} kind={workOrder.kind} />
      </div>

      <div className="grid md:grid-cols-[1fr_300px]">
        {/* 左栏:详情与操作 */}
        <div className="space-y-5 px-6 py-5">
          <section>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">基本信息</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4 text-sm">
              {isPublic ? (
                <>
                  <InfoRow label="维修位置">{workOrder.location?.label ?? '—'}</InfoRow>
                  <InfoRow label="所属区域">
                    {workOrder.location?.zoneId ? `${workOrder.location.zoneId} 区` : '全园区公共'}
                  </InfoRow>
                </>
              ) : (
                <>
                  <InfoRow label="报修企业">
                    {company ? (
                      <Link to={`/property/companies/${company.id}`} className="text-primary hover:underline">
                        {company.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </InfoRow>
                  <InfoRow label="联系人 / 电话">
                    {company ? `${company.contactName} · ${company.contactPhone}` : '—'}
                  </InfoRow>
                </>
              )}
              <InfoRow label="维修类别">{workOrderCategoryMap[workOrder.category]}</InfoRow>
              <InfoRow label="维修人员">{staff ? `${staff.name}(${deptMap[staff.dept]})` : '待派单'}</InfoRow>
              <InfoRow label="报修时间">{formatDateTime(reportedAt(workOrder))}</InfoRow>
              <InfoRow label="预约处理时间">{formatDateTime(workOrder.appointmentAt)}</InfoRow>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">工单内容</h4>
            <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm leading-relaxed">{workOrder.description}</p>
          </section>

          {workOrder.completionNote && (
            <section>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">完工说明</h4>
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
                {workOrder.completionNote}
              </p>
            </section>
          )}

          {workOrder.satisfactionRating && (
            <section>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">企业满意度评价</h4>
              <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
                <StarRating value={workOrder.satisfactionRating} />
                {workOrder.ratingComment && (
                  <span className="text-sm text-muted-foreground">「{workOrder.ratingComment}」</span>
                )}
              </div>
            </section>
          )}

          <ActionZone workOrder={workOrder} />
        </div>

        {/* 右栏:处理时间线 */}
        <aside className="border-t px-6 py-5 md:border-t-0 md:border-l">
          <h4 className="mb-3 text-xs font-medium text-muted-foreground">处理时间线</h4>
          <Timeline
            entries={workOrder.events.map((e, i) => ({
              key: `${workOrder.id}-${i}`,
              title: workOrderEventMap[e.type],
              at: e.at,
              by: e.by,
              content: e.note,
            }))}
          />
        </aside>
      </div>
    </>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5">{children}</p>
    </div>
  )
}

/** 按当前状态渲染物业可执行的动作:接单 → 派单 → 预约 → 录入完工 →(公共单)验收关单 */
function ActionZone({ workOrder }: { workOrder: WorkOrder }) {
  const state = useAppStore()
  const status = deriveWorkOrderStatus(workOrder)
  const { acceptWorkOrder, dispatchWorkOrder, setAppointment, submitCompletion, acceptancePublicWorkOrder } = state

  const [dept, setDept] = useState<DeptCode>('engineering')
  const [staffId, setStaffId] = useState('')
  const [appointmentAt, setAppointmentAt] = useState('')
  const [note, setNote] = useState('')

  if (status === 'closed') return null

  const deptStaff = state.staff.filter((s) => s.dept === dept)

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="mb-3 text-sm font-medium">下一步操作</h4>

      {status === 'pending' && (
        <Button
          size="sm"
          onClick={() => {
            acceptWorkOrder(workOrder.id)
            toast.success(`工单 ${workOrder.id} 已接单`)
          }}
        >
          确认接单
        </Button>
      )}

      {status === 'accepted' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">责任部门</Label>
              <Select
                value={dept}
                onValueChange={(v) => {
                  setDept(v as DeptCode)
                  setStaffId('')
                }}
              >
                <SelectTrigger size="sm" className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['engineering', 'customer_service', 'security', 'cleaning'] as DeptCode[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {deptMap[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">维修人员</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger size="sm" className="w-full bg-background">
                  <SelectValue placeholder="选择人员" />
                </SelectTrigger>
                <SelectContent>
                  {deptStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            disabled={!staffId}
            onClick={() => {
              dispatchWorkOrder(workOrder.id, dept, staffId)
              toast.success('已派单,等待维修人员预约时间')
            }}
          >
            派单
          </Button>
        </div>
      )}

      {status === 'dispatched' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">预约处理时间</Label>
            <Input
              type="datetime-local"
              className="h-8 w-56 bg-background"
              value={appointmentAt}
              onChange={(e) => setAppointmentAt(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={!appointmentAt}
            onClick={() => {
              setAppointment(workOrder.id, `${appointmentAt}:00`)
              toast.success('预约时间已设置,工单进入处理中')
            }}
          >
            设置预约时间
          </Button>
        </div>
      )}

      {status === 'in_progress' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">完工说明</Label>
            <Textarea
              placeholder="填写维修结果,如:已更换损坏部件,测试正常"
              className="bg-background"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={!note.trim()}
            onClick={() => {
              submitCompletion(workOrder.id, note.trim())
              toast.success(
                workOrder.kind === 'public' ? '完工数据已录入,待物业验收关单' : '完工数据已录入,等待企业电子签字关单',
              )
            }}
          >
            录入完工数据
          </Button>
        </div>
      )}

      {status === 'done_pending_sign' &&
        (workOrder.kind === 'public' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">公共区域维修已完工,物业验收合格后即可关单。</p>
            <Button
              size="sm"
              onClick={() => {
                acceptancePublicWorkOrder(workOrder.id)
                toast.success('验收合格,工单已关单')
              }}
            >
              验收关单
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            维修已完工,等待企业在企业端<span className="font-medium text-foreground">电子签字</span>确认关单。
          </p>
        ))}
    </section>
  )
}
