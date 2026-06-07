import { Building2, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { DATA_RETENTION_YEARS } from '@/data/constants'
import { getMonthCollection } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import type { FeeType } from '@/data/types'
import { CURRENT_MONTH } from '@/lib/date'
import { formatCurrency, formatMonth, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ExportButton, FeeTypeSelect, MonthSelect, RateBar, rateTextColor } from './paymentsShared'

export function PaymentsCommunityPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const month = searchParams.get('month') ?? CURRENT_MONTH
  const fee = searchParams.get('fee') ?? 'all'

  const state = useAppStore()
  const scopeFee = fee === 'all' ? undefined : (fee as FeeType)

  const total = useMemo(() => getMonthCollection(state, month, { feeType: scopeFee }), [state, month, scopeFee])
  const rows = useMemo(
    () =>
      state.communities.map((c) => {
        const summary = getMonthCollection(state, month, { communityId: c.id, feeType: scopeFee })
        const households = state.households.filter((h) => h.communityId === c.id)
        return {
          community: c,
          summary,
          buildingCount: state.buildings.filter((b) => b.communityId === c.id).length,
          householdCount: households.length,
          vacantCount: households.filter((h) => h.isVacant).length,
        }
      }),
    [state, month, scopeFee],
  )

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="缴费 / 收款"
        description={`${formatMonth(month)} 全公司:应收 ${formatCurrency(total.receivable)} · 实收 ${formatCurrency(total.received)} · 收缴率 ${formatPercent(total.rate)}`}
      >
        <MonthSelect value={month} onChange={(v) => setParam('month', v)} />
        <FeeTypeSelect value={fee} onChange={(v) => setParam('fee', v)} />
        <ExportButton />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ community, summary, buildingCount, householdCount, vacantCount }) => (
          <Card
            key={community.id}
            className="cursor-pointer py-0 transition-shadow hover:shadow-md"
            onClick={() => navigate(`/property/payments/${community.id}?month=${month}&fee=${fee}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold">{community.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {buildingCount} 栋 · {householdCount} 户
                      {vacantCount > 0 && ` · 空置 ${vacantCount} 户`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-xs text-muted-foreground">
                  <p>
                    应收 <span className="font-medium text-foreground">{formatCurrency(summary.receivable)}</span>
                  </p>
                  <p className="mt-0.5">
                    实收 <span className="font-medium text-foreground">{formatCurrency(summary.received)}</span>
                  </p>
                </div>
                <p className={cn('text-2xl font-semibold tabular-nums', rateTextColor(summary.rate))}>
                  {formatPercent(summary.rate)}
                </p>
              </div>
              <RateBar rate={summary.rate} className="mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        * 收款数据保留 {DATA_RETENTION_YEARS} 年,可按小区 / 月份 / 费用类型筛选导出;点击小区卡片逐级下钻:小区 → 楼栋 →
        单元 → 户。
      </p>
    </div>
  )
}
