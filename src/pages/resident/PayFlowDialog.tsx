import { CircleCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { billOutstanding, getArrears } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import { formatCurrency, formatMonth } from '@/lib/format'
import { feeTypeMap } from '@/lib/statusMaps'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** mock 缴费流程:勾选账单 → 确认支付 → 成功(真实更新 store,两端联动) */
export function PayFlowDialog({ open, onOpenChange }: Props) {
  const state = useAppStore()
  const { payBills } = state
  const householdId = state.currentUser?.householdId

  const owingBills = useMemo(
    () => (householdId ? getArrears(state, householdId).bills : []),
    [state, householdId],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<'select' | 'success'>('select')
  const [paidAmount, setPaidAmount] = useState(0)

  // 每次打开时默认全选
  useEffect(() => {
    if (open) {
      setSelected(new Set(owingBills.map((b) => b.id)))
      setStep('select')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const total = owingBills.filter((b) => selected.has(b.id)).reduce((s, b) => s + billOutstanding(b), 0)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirm = () => {
    payBills([...selected])
    setPaidAmount(total)
    setStep('success')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>缴费</DialogTitle>
              <DialogDescription>勾选需要缴纳的账单,确认后完成支付(演示环境模拟支付)</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {owingBills.map((bill) => (
                <label
                  key={bill.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <Checkbox checked={selected.has(bill.id)} onCheckedChange={() => toggle(bill.id)} />
                  <span className="flex-1 text-sm">
                    {formatMonth(bill.month)} · {feeTypeMap[bill.feeType].label}
                    {bill.isHalfPrice && (
                      <Badge variant="outline" className="ml-1.5 border-zinc-300 bg-zinc-100 px-1.5 py-0 font-normal text-zinc-600">
                        半价
                      </Badge>
                    )}
                    {bill.paidAmount > 0 && <span className="ml-1.5 text-xs text-muted-foreground">(补差额)</span>}
                  </span>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(billOutstanding(bill))}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">合计(已选 {selected.size} 笔)</span>
              <span className="text-xl font-semibold text-primary tabular-nums">{formatCurrency(total)}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button disabled={selected.size === 0} onClick={confirm}>
                确认支付
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <CircleCheck className="size-16 text-emerald-500" />
            <p className="mt-4 text-lg font-semibold">支付成功</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              缴费记录已实时更新,物业端收缴数据同步变化。感谢您的支持!
            </p>
            <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
              完成
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
