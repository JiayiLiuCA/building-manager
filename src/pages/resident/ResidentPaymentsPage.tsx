import { CircleCheck, CreditCard } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { PaymentHistory } from '@/components/shared/PaymentHistory'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { billOutstanding, getArrears, getBillStatus } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import { formatCurrency, formatMonth } from '@/lib/format'
import { billStatusMap, feeTypeMap } from '@/lib/statusMaps'
import { PayFlowDialog } from './PayFlowDialog'

export function ResidentPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useAppStore()
  const householdId = state.currentUser?.householdId ?? ''

  const arrears = useMemo(() => getArrears(state, householdId), [state, householdId])

  // 催缴弹窗「立即缴费」深链:?pay=1 自动打开缴费弹窗
  const [payOpen, setPayOpen] = useState(searchParams.get('pay') === '1')

  const openPay = (open: boolean) => {
    setPayOpen(open)
    if (!open && searchParams.has('pay')) {
      const next = new URLSearchParams(searchParams)
      next.delete('pay')
      setSearchParams(next, { replace: true })
    }
  }

  return (
    <div className="space-y-4">
      {/* 当前应缴 */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">当前应缴款项</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {arrears.amount === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="账单已全部结清"
              description="您没有待缴款项,感谢您的支持!"
            />
          ) : (
            <>
              <div className="flex items-end justify-between rounded-lg border border-red-200 bg-red-50/60 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">累计待缴(含 {arrears.months} 个月账单)</p>
                  <p className="mt-1 text-2xl font-semibold text-red-600 tabular-nums">
                    {formatCurrency(arrears.amount)}
                  </p>
                </div>
                <Button onClick={() => openPay(true)}>
                  <CreditCard /> 去缴费
                </Button>
              </div>
              <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {arrears.bills.map((bill) => (
                  <li key={bill.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>
                      {formatMonth(bill.month)} · {feeTypeMap[bill.feeType].label}
                      {bill.isHalfPrice && (
                        <Badge variant="outline" className="ml-1.5 border-zinc-300 bg-zinc-100 px-1.5 py-0 font-normal text-zinc-600">
                          半价
                        </Badge>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-red-600 tabular-nums">
                        {formatCurrency(billOutstanding(bill))}
                      </span>
                      <StatusBadge meta={billStatusMap[getBillStatus(bill)]} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* 缴费记录:近 12 个月,按费用类型筛选 + 趋势图 + 按月明细(物业端户档案共用同款组件) */}
      <PaymentHistory householdId={householdId} />

      <PayFlowDialog open={payOpen} onOpenChange={openPay} />
    </div>
  )
}
