import { BellRing } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getArrears } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import { formatCurrency, formatDate } from '@/lib/format'

/**
 * 业主端催缴弹窗:存在 active 且本次会话未提示过的催缴记录时,进入业主端自动弹出。
 * 「立即缴费」跳转缴费页并自动打开缴费弹窗;两种关闭方式都会标记已读(本次会话不再弹)。
 */
export function DunningNoticeDialog() {
  const navigate = useNavigate()
  const state = useAppStore()
  const { markDunningSeen } = state
  const householdId = state.currentUser?.householdId

  const record = useMemo(
    () =>
      state.dunningRecords.find(
        (r) => r.householdId === householdId && r.status === 'active' && !state.seenDunningIds.includes(r.id),
      ),
    [state.dunningRecords, state.seenDunningIds, householdId],
  )
  const household = state.households.find((h) => h.id === householdId)
  const arrears = useMemo(
    () => (householdId ? getArrears(state, householdId) : { amount: 0, months: 0, bills: [] }),
    [state, householdId],
  )

  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (record) setOpen(true)
  }, [record])

  if (!record || !household) return null

  const dismiss = () => {
    markDunningSeen(record.id)
    setOpen(false)
  }

  const payNow = () => {
    markDunningSeen(record.id)
    setOpen(false)
    navigate('/resident/payments?pay=1')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100">
            <BellRing className="size-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">物业费催缴通知</DialogTitle>
          <DialogDescription className="text-center">
            尊敬的{household.ownerName}业主,您的房屋存在欠费账单,请尽快缴纳
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">房屋</span>
            <span className="font-medium">{household.householdNo}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">累计欠费</span>
            <span className="text-lg font-semibold text-red-600 tabular-nums">{formatCurrency(arrears.amount)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">涉及月份</span>
            <span className="font-medium">{arrears.months} 个月</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">催缴时间</span>
            <span className="font-medium tabular-nums">{formatDate(record.createdAt)}</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          物业服务的持续投入离不开您的支持。如对账单有疑问,或因服务问题暂缓缴费,请通过「投诉」或客服热线反馈,我们将优先为您解决。
        </p>
        <DialogFooter className="gap-2 sm:flex-col">
          <Button className="w-full" onClick={payNow}>
            立即缴费
          </Button>
          <Button variant="ghost" className="w-full" onClick={dismiss}>
            稍后再说
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
