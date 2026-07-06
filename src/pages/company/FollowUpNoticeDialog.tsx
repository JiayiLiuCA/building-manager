import { BellRing } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getArrears } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import { formatCurrency, formatDate } from '@/lib/format'
import { paymentMethodMap } from '@/lib/statusMaps'

/**
 * 企业端缴费提醒弹窗(原催缴弹窗弱化版):
 * 仅当物业发起收款跟进(存在 active 且本次会话未提示过的跟进记录)时自动弹出一次。
 * 语气为「提醒 + 按习惯安排」,非催缴;两种关闭方式都会标记已读。
 */
export function FollowUpNoticeDialog() {
  const navigate = useNavigate()
  const scoped = useScopedData()
  const markFollowUpSeen = useAppStore((s) => s.markFollowUpSeen)
  const seenFollowUpIds = useAppStore((s) => s.seenFollowUpIds)
  const companyId = scoped.currentUser?.companyId

  const record = useMemo(
    () =>
      scoped.followUpRecords.find(
        (r) => r.companyId === companyId && r.status === 'active' && !seenFollowUpIds.includes(r.id),
      ),
    [scoped.followUpRecords, seenFollowUpIds, companyId],
  )
  const company = scoped.companies.find((c) => c.id === companyId)
  const arrears = useMemo(
    () => (companyId ? getArrears(scoped, companyId) : { amount: 0, months: 0, bills: [] }),
    [scoped, companyId],
  )

  // 无本地 open 态:markFollowUpSeen 更新 store 后 record 即消失,弹窗随之关闭(每次登录只弹一次)
  if (!record || !company) return null

  const habit = company.paymentHabit

  const dismiss = () => {
    markFollowUpSeen(record.id)
  }

  const viewBills = () => {
    markFollowUpSeen(record.id)
    navigate('/company/bills?pay=1')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100">
            <BellRing className="size-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">缴费提醒</DialogTitle>
          <DialogDescription className="text-center">
            尊敬的{company.name},物业已为贵司登记收款跟进,请留意近期账单安排
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">当前待缴</span>
            <span className="text-lg font-semibold text-amber-700 tabular-nums">{formatCurrency(arrears.amount)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">涉及月份</span>
            <span className="font-medium">{arrears.months} 个月</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">跟进登记时间</span>
            <span className="font-medium tabular-nums">{formatDate(record.createdAt)}</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {habit
            ? `贵司登记的缴费习惯为每月 ${habit.payDay} 日${paymentMethodMap[habit.method]},可按习惯安排缴纳。`
            : '贵司暂未登记缴费习惯,可联系客服专员登记,便于我们按贵司节奏安排对账。'}
          如对账单金额有疑问,或有服务问题未解决,请通过「报事报修 · 投诉」或客服专员反馈,我们将优先处理。
        </p>
        <DialogFooter className="gap-2 sm:flex-col">
          <Button className="w-full" onClick={viewBills}>
            查看账单
          </Button>
          <Button variant="ghost" className="w-full" onClick={dismiss}>
            稍后处理
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
