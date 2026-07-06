import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BillingHistory } from '@/components/shared/BillingHistory'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { billOutstanding, getArrears, getBillStatus } from '@/data/selectors/billingSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatCurrency, formatMonth } from '@/lib/format'
import { billStatusMap, billSubTypeMap, feeCategoryMap } from '@/lib/statusMaps'
import { PayFlowDialog } from './PayFlowDialog'

export function CompanyBillsPage() {
  const scoped = useScopedData()
  const [searchParams, setSearchParams] = useSearchParams()
  const companyId = scoped.currentUser?.companyId ?? ''
  const arrears = useMemo(() => getArrears(scoped, companyId), [scoped, companyId])

  // ?pay=1 深链:懒初始化在挂载时读取一次,进入页面即打开缴费弹窗(缴费提醒/待办跳转用)
  const [payOpen, setPayOpen] = useState(searchParams.get('pay') === '1')

  const onPayOpenChange = (open: boolean) => {
    setPayOpen(open)
    if (!open && searchParams.get('pay')) {
      const next = new URLSearchParams(searchParams)
      next.delete('pay')
      setSearchParams(next, { replace: true })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="账单与缴费" description="物业服务费 / 车辆服务费 / 水电能耗费 / 增值服务费 · 在线缴纳实时联动物业端" />

      {/* 当前应缴 */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">当前应缴款项</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {arrears.amount === 0 ? (
            <EmptyState title="账单已全部结清" description="本月账单可在下方「账单记录」中查看" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">累计待缴(含 {arrears.months} 个月)</p>
                  <p className="mt-0.5 text-2xl font-semibold text-red-600 tabular-nums">{formatCurrency(arrears.amount)}</p>
                </div>
                <Button onClick={() => setPayOpen(true)}>去缴费</Button>
              </div>
              <ul className="mt-3 divide-y rounded-lg border">
                {arrears.bills.map((bill) => (
                  <li key={bill.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      {formatMonth(bill.month)} · {feeCategoryMap[bill.category].label}
                      {bill.subType && <span className="text-xs text-muted-foreground">({billSubTypeMap[bill.subType]})</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{formatCurrency(billOutstanding(bill))}</span>
                      <StatusBadge meta={billStatusMap[getBillStatus(bill)]} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* 近 12 个月账单(四费类,双端共用组件) */}
      <BillingHistory companyId={companyId} />

      <PayFlowDialog open={payOpen} onOpenChange={onPayOpenChange} />
    </div>
  )
}
