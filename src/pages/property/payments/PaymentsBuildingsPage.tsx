import { ChevronRight, Landmark } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { DrillBreadcrumb } from '@/components/shared/DrillBreadcrumb'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { getMonthCollection } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import type { FeeType } from '@/data/types'
import { CURRENT_MONTH } from '@/lib/date'
import { formatCurrency, formatMonth, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ExportButton, MonthSelect, RateBar, rateTextColor } from './paymentsShared'

export function PaymentsBuildingsPage() {
  const { communityId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const month = searchParams.get('month') ?? CURRENT_MONTH
  const fee = searchParams.get('fee') ?? 'all'

  const state = useAppStore()
  const community = state.communities.find((c) => c.id === communityId)
  const scopeFee = fee === 'all' ? undefined : (fee as FeeType)

  const rows = useMemo(() => {
    if (!community) return []
    return state.buildings
      .filter((b) => b.communityId === community.id)
      .map((b) => {
        const households = state.households.filter((h) => h.buildingId === b.id)
        return {
          buildingId: b.id,
          no: b.no,
          ...getMonthCollection(state, month, { buildingId: b.id, feeType: scopeFee }),
          householdCount: households.length,
          vacantCount: households.filter((h) => h.isVacant).length,
        }
      })
  }, [state, community, month, scopeFee])

  if (!community) return <Navigate to="/property/payments" replace />

  return (
    <div className="mx-auto max-w-7xl">
      <DrillBreadcrumb
        items={[
          { label: '全部小区', to: `/property/payments?month=${month}&fee=${fee}` },
          { label: community.name },
        ]}
      />
      <PageHeader title={`${community.name} · 楼栋收缴`} description={`${formatMonth(month)} 按楼栋汇总,点击下钻到单元 / 户`}>
        <MonthSelect
          value={month}
          onChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.set('month', v)
            setSearchParams(next, { replace: true })
          }}
        />
        <ExportButton />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Card
            key={row.buildingId}
            className="cursor-pointer py-0 transition-shadow hover:shadow-md"
            onClick={() => navigate(`/property/payments/${community.id}/${row.buildingId}?month=${month}&fee=${fee}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Landmark className="size-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold">{row.no}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.householdCount} 户{row.vacantCount > 0 && ` · 空置 ${row.vacantCount} 户`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-xs text-muted-foreground">
                  <p>
                    应收 <span className="font-medium text-foreground">{formatCurrency(row.receivable)}</span>
                  </p>
                  <p className="mt-0.5">
                    实收 <span className="font-medium text-foreground">{formatCurrency(row.received)}</span>
                  </p>
                </div>
                <p className={cn('text-2xl font-semibold tabular-nums', rateTextColor(row.rate))}>
                  {formatPercent(row.rate)}
                </p>
              </div>
              <RateBar rate={row.rate} className="mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
