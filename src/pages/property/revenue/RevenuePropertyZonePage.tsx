import { Building2, Percent, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { DrillBreadcrumb } from '@/components/shared/DrillBreadcrumb'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getBuildingDrillRows } from '@/data/selectors/revenueSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatWan, rateTextClass } from '@/lib/charts'
import { formatPercent } from '@/lib/format'
import { formatPeriodLabel } from '@/lib/period'
import { PeriodSwitcher } from './revenueShared'
import { usePeriodParam } from './usePeriod'

export function RevenuePropertyZonePage() {
  const { zoneId = '' } = useParams()
  const scoped = useScopedData()
  const period = usePeriodParam()
  const navigate = useNavigate()

  const zone = scoped.zones.find((z) => z.id === zoneId)
  const rows = useMemo(() => getBuildingDrillRows(scoped, zoneId, period), [scoped, zoneId, period])

  if (!zone || rows.length === 0) return <Navigate to="/property/revenue/property" replace />

  const receivable = rows.reduce((s, r) => s + r.receivable, 0)
  const achieved = rows.reduce((s, r) => s + r.achieved, 0)
  const rate = receivable === 0 ? 1 : achieved / receivable
  const query = `?kind=${period.kind}&key=${period.key}`

  return (
    <div className="space-y-4">
      <DrillBreadcrumb items={[{ label: '物业服务收费', to: `/property/revenue/property${query}` }, { label: zone.name }]} />
      <PageHeader title={`${zone.name} · 物业服务收费`} description={`${formatPeriodLabel(period)} · 按楼栋下钻;整栋独占楼栋直达该企业档案`}>
        <PeriodSwitcher period={period} />
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard title="期间应收" value={formatWan(receivable)} icon={Wallet} sub={`${rows.length} 栋 · 物业服务费`} />
        <KpiCard title="达成(实收)" value={formatWan(achieved)} icon={Building2} sub={`未收 ${formatWan(receivable - achieved)}`} />
        <KpiCard title="收缴率" value={formatPercent(rate)} icon={Percent} alert={rate < 0.88} alertText="低于 88%,需关注" />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">楼栋收费达成(点击行下钻)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>楼栋</TableHead>
                <TableHead className="text-right">入驻企业</TableHead>
                <TableHead className="text-right">期间应收</TableHead>
                <TableHead className="text-right">达成(实收)</TableHead>
                <TableHead className="text-right">收缴率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.building.id}
                  className="cursor-pointer"
                  onClick={() =>
                    row.wholeCompany
                      ? navigate(`/property/companies/${row.wholeCompany.id}`)
                      : navigate(`/property/revenue/property/${zoneId}/${row.building.id}${query}`)
                  }
                >
                  <TableCell className="font-medium">
                    {row.building.no}
                    {row.wholeCompany ? (
                      <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">
                        整栋独占 · {row.wholeCompany.name} → 直达企业
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">
                        多户楼栋
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.companyCount} 家</TableCell>
                  <TableCell className="text-right tabular-nums">¥{row.receivable.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">¥{row.achieved.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${rateTextClass(row.rate)}`}>
                    {formatPercent(row.rate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
