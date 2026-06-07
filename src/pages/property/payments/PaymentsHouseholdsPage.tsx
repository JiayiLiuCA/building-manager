import { useMemo } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { DrillBreadcrumb } from '@/components/shared/DrillBreadcrumb'
import { MoneyText } from '@/components/shared/MoneyText'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { VacantBadge } from '@/components/shared/VacantBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getArrears, getMonthCollection } from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import type { BillStatus, FeeType, Household } from '@/data/types'
import { CURRENT_MONTH } from '@/lib/date'
import { formatCurrency, formatMonth, formatPercent } from '@/lib/format'
import { billStatusMap } from '@/lib/statusMaps'
import { cn } from '@/lib/utils'
import { ExportButton, MonthSelect, RateBar, rateTextColor } from './paymentsShared'

export function PaymentsHouseholdsPage() {
  const { communityId = '', buildingId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const month = searchParams.get('month') ?? CURRENT_MONTH
  const fee = searchParams.get('fee') ?? 'all'
  const unitFilter = searchParams.get('unit')

  const state = useAppStore()
  const community = state.communities.find((c) => c.id === communityId)
  const building = state.buildings.find((b) => b.id === buildingId)
  const scopeFee = fee === 'all' ? undefined : (fee as FeeType)

  const units = useMemo(
    () =>
      state.units
        .filter((u) => u.buildingId === buildingId)
        .map((u) => ({
          unit: u,
          summary: getMonthCollection(state, month, { unitId: u.id, feeType: scopeFee }),
        })),
    [state, buildingId, month, scopeFee],
  )

  if (!community || !building) return <Navigate to="/property/payments" replace />

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const visibleUnits = unitFilter ? units.filter((u) => u.unit.id === unitFilter) : units

  return (
    <div className="mx-auto max-w-7xl">
      <DrillBreadcrumb
        items={[
          { label: '全部小区', to: `/property/payments?month=${month}&fee=${fee}` },
          { label: community.name, to: `/property/payments/${community.id}?month=${month}&fee=${fee}` },
          { label: building.no },
          ...(unitFilter ? [{ label: units.find((u) => u.unit.id === unitFilter)?.unit.no ?? '' }] : []),
        ]}
      />
      <PageHeader
        title={`${community.name}${building.no} · 单元 / 户`}
        description={`${formatMonth(month)} 按单元分组,点击户查看 360° 档案`}
      >
        <MonthSelect value={month} onChange={(v) => setParam('month', v)} />
        <ExportButton />
      </PageHeader>

      {/* 单元汇总卡(点击筛选该单元) */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {units.map(({ unit, summary }) => (
          <Card
            key={unit.id}
            className={cn(
              'cursor-pointer py-0 transition-all hover:shadow-sm',
              unitFilter === unit.id && 'ring-2 ring-primary',
            )}
            onClick={() => setParam('unit', unitFilter === unit.id ? null : unit.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{unit.no}</p>
                <p className={cn('text-sm font-semibold tabular-nums', rateTextColor(summary.rate))}>
                  {formatPercent(summary.rate)}
                </p>
              </div>
              <RateBar rate={summary.rate} className="mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 户列表(按单元分组) */}
      <div className="space-y-5">
        {visibleUnits.map(({ unit }) => (
          <Card key={unit.id} className="py-0">
            <CardHeader className="border-b py-3!">
              <CardTitle className="text-sm font-medium">
                {community.name}
                {building.no}
                {unit.no}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <HouseholdTable
                households={state.households.filter((h) => h.unitId === unit.id)}
                month={month}
                scopeFee={scopeFee}
                onOpen={(h) => navigate(`/property/households/${h.id}`)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function HouseholdTable({
  households,
  month,
  scopeFee,
  onOpen,
}: {
  households: Household[]
  month: string
  scopeFee?: FeeType
  onOpen: (h: Household) => void
}) {
  const bills = useAppStore((s) => s.bills)

  const rows = households.map((h) => {
    const monthBills = bills.filter(
      (b) => b.householdId === h.id && b.month === month && (!scopeFee || b.feeType === scopeFee),
    )
    const amount = monthBills.reduce((s, b) => s + b.amount, 0)
    const paid = monthBills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
    const status: BillStatus = paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    const arrears = getArrears({ bills }, h.id)
    return { h, amount, paid, status, arrears }
  })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">户号</TableHead>
          <TableHead>业主</TableHead>
          <TableHead>电话</TableHead>
          <TableHead className="text-right">面积</TableHead>
          <TableHead>标识</TableHead>
          <TableHead className="text-right">本月应缴</TableHead>
          <TableHead className="text-right">本月实缴</TableHead>
          <TableHead>本月状态</TableHead>
          <TableHead className="text-right">累计欠费</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ h, amount, paid, status, arrears }) => (
          <TableRow key={h.id} className="cursor-pointer" onClick={() => onOpen(h)}>
            <TableCell className="pl-4 font-medium">{h.roomNo}</TableCell>
            <TableCell>{h.ownerName}</TableCell>
            <TableCell className="text-muted-foreground">{h.ownerPhone}</TableCell>
            <TableCell className="text-right tabular-nums">{h.areaSqm}㎡</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {h.isVacant && <VacantBadge />}
                {h.anomaly && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 font-normal text-amber-700">
                    数据待核实
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {amount === 0 ? '—' : formatCurrency(amount)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{paid === 0 ? '—' : formatCurrency(paid)}</TableCell>
            <TableCell>{amount === 0 ? '—' : <StatusBadge meta={billStatusMap[status]} />}</TableCell>
            <TableCell className="text-right">
              {arrears.amount > 0 ? <MoneyText amount={arrears.amount} danger /> : '—'}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="text-primary">
                查看档案
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
