import { CircleCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { billOutstanding, getArrears } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import { formatCurrency, formatMonth } from '@/lib/format'
import { billSubTypeMap, feeCategoryMap } from '@/lib/statusMaps'
import type { Bill } from '@/data/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function billLabel(bill: Bill): string {
  const cat = feeCategoryMap[bill.category].label
  return bill.subType ? `${cat}(${billSubTypeMap[bill.subType]})` : cat
}

/** mock 缴费流程:勾选账单 → 确认支付 → 成功(真实更新 store,两端联动) */
export function PayFlowDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <PayBody onOpenChange={onOpenChange} />}</DialogContent>
    </Dialog>
  )
}

/** 弹窗内容随打开挂载:选中态用懒初始化默认全选,关闭即卸载重置 */
function PayBody({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const scoped = useScopedData()
  const payBills = useAppStore((s) => s.payBills)
  const companyId = scoped.currentUser?.companyId

  const owingBills = useMemo(() => (companyId ? getArrears(scoped, companyId).bills : []), [scoped, companyId])

  const [selected, setSelected] = useState<Set<string>>(() => new Set(owingBills.map((b) => b.id)))
  const [step, setStep] = useState<'select' | 'success'>('select')
  const [paidAmount, setPaidAmount] = useState(0)

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
    <>
      {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>企业缴费</DialogTitle>
              <DialogDescription>勾选需要缴纳的账单,确认后完成支付(演示环境模拟对公支付)</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {owingBills.map((bill) => (
                <label
                  key={bill.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <Checkbox checked={selected.has(bill.id)} onCheckedChange={() => toggle(bill.id)} />
                  <span className="flex-1 text-sm">
                    {formatMonth(bill.month)} · {billLabel(bill)}
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
              缴费记录已实时更新,物业端收缴数据同步变化;发票将在缴清后由物业上传至「发票查询」。
            </p>
            <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
              完成
            </Button>
          </div>
      )}
    </>
  )
}
