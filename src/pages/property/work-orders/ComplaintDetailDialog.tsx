import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timeline } from '@/components/shared/Timeline'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { complaintCreatedAt, deriveComplaintStatus, isSupervisorInvolved } from '@/data/selectors/complaintSelectors'
import { useAppStore } from '@/data/store'
import type { Complaint, DeptCode } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { complaintEventMap, complaintStatusMap, deptMap } from '@/lib/statusMaps'

interface Props {
  complaint?: Complaint
  onClose: () => void
}

/**
 * 投诉详情 Modal(全局挂载于 PropertyLayout,由 ?detail=CP-xxx 驱动):
 * 左栏 基本信息 / 投诉内容 / 下一步操作 → 右栏 处理升级链
 */
export function ComplaintDetailDialog({ complaint, onClose }: Props) {
  return (
    <Dialog open={!!complaint} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-4xl">
        {complaint && <DetailBody complaint={complaint} />}
      </DialogContent>
    </Dialog>
  )
}

function DetailBody({ complaint }: { complaint: Complaint }) {
  const state = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = deriveComplaintStatus(complaint)
  const household = state.households.find((h) => h.id === complaint.householdId)

  // 在当前页面内切换到关联工单的详情 Modal(不跳路由)
  const openWorkOrder = (woId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', woId)
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <DialogHeader className="border-b px-6 pt-5 pb-4 text-left">
        <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="font-mono">{complaint.id}</span>
          <StatusBadge meta={complaintStatusMap[status]} />
          {isSupervisorInvolved(complaint) && status !== 'supervisor' && (
            <span className="text-xs font-normal text-muted-foreground">(曾主管介入)</span>
          )}
        </DialogTitle>
        <DialogDescription>
          {household?.householdNo} · 提交于 {formatDateTime(complaintCreatedAt(complaint))}
        </DialogDescription>
      </DialogHeader>

      <div className="grid md:grid-cols-[1fr_300px]">
        {/* 左栏:详情与操作 */}
        <div className="space-y-5 px-6 py-5">
          <section>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">基本信息</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">投诉户</p>
                <p className="mt-0.5">
                  {household ? (
                    <Link to={`/property/households/${household.id}`} className="text-primary hover:underline">
                      {household.householdNo}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">业主 / 电话</p>
                <p className="mt-0.5">{household ? `${household.ownerName} · ${household.ownerPhone}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">关联工单</p>
                <p className="mt-0.5">
                  {complaint.workOrderId ? (
                    <button
                      type="button"
                      className="font-mono text-xs text-primary hover:underline"
                      onClick={() => openWorkOrder(complaint.workOrderId!)}
                    >
                      {complaint.workOrderId}
                    </button>
                  ) : (
                    '无(独立投诉)'
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">责任部门</p>
                <p className="mt-0.5">{complaint.responsibleDept ? deptMap[complaint.responsibleDept] : '待派单'}</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">投诉内容</h4>
            <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm leading-relaxed">{complaint.content}</p>
          </section>

          <ActionZone complaint={complaint} />
        </div>

        {/* 右栏:升级链时间线 */}
        <aside className="border-t px-6 py-5 md:border-t-0 md:border-l">
          <h4 className="mb-3 text-xs font-medium text-muted-foreground">处理升级链</h4>
          <Timeline
            entries={complaint.events.map((e, i) => ({
              key: `${complaint.id}-${i}`,
              title: e.dept ? `${complaintEventMap[e.type]}(${deptMap[e.dept]})` : complaintEventMap[e.type],
              at: e.at,
              by: e.by,
              content: e.content,
            }))}
          />
        </aside>
      </div>
    </>
  )
}

/** 按状态渲染处理动作:派单 → 部门回复 → (业主不满意 → 主管回复)→ 关闭 */
function ActionZone({ complaint }: { complaint: Complaint }) {
  const { dispatchComplaint, replyComplaint, supervisorReply, closeComplaint } = useAppStore()
  const status = deriveComplaintStatus(complaint)
  const [dept, setDept] = useState<DeptCode>('engineering')
  const [reply, setReply] = useState('')

  if (status === 'closed') return null

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="mb-3 text-sm font-medium">下一步操作</h4>

      {status === 'pending' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">派至唯一责任部门</Label>
            <Select value={dept} onValueChange={(v) => setDept(v as DeptCode)}>
              <SelectTrigger size="sm" className="w-44 bg-background">
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
          <Button
            size="sm"
            onClick={() => {
              dispatchComplaint(complaint.id, dept)
              toast.success(`已派至${deptMap[dept]},限期处理`)
            }}
          >
            派单
          </Button>
        </div>
      )}

      {status === 'processing' && (
        <ReplyForm
          label="部门处理回复"
          placeholder="填写处理情况与整改措施,回复业主"
          buttonText="提交部门回复"
          value={reply}
          onChange={setReply}
          onSubmit={() => {
            replyComplaint(complaint.id, reply.trim())
            setReply('')
            toast.success('已回复业主,等待业主确认')
          }}
        />
      )}

      {status === 'supervisor' && (
        <ReplyForm
          label="主管介入回复"
          placeholder="主管复核后回复业主,给出最终解决方案"
          buttonText="提交主管回复"
          value={reply}
          onChange={setReply}
          onSubmit={() => {
            supervisorReply(complaint.id, reply.trim())
            setReply('')
            toast.success('主管已回复业主')
          }}
        />
      )}

      {status === 'replied' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            已回复业主:业主可在业主端确认关闭,或对结果不满意申请主管介入。若已电话确认业主满意,可代为关闭。
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              closeComplaint(complaint.id)
              toast.success('投诉已关闭')
            }}
          >
            已确认满意,关闭投诉
          </Button>
        </div>
      )}
    </section>
  )
}

function ReplyForm({
  label,
  placeholder,
  buttonText,
  value,
  onChange,
  onSubmit,
}: {
  label: string
  placeholder: string
  buttonText: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <Textarea
          placeholder={placeholder}
          className="bg-background"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <Button size="sm" disabled={!value.trim()} onClick={onSubmit}>
        {buttonText}
      </Button>
    </div>
  )
}
