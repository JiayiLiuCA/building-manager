import { Building2, Percent, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { DrillBreadcrumb } from '@/components/shared/DrillBreadcrumb'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getCompanyDrillRows } from '@/data/selectors/revenueSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatWan, rateTextClass } from '@/lib/charts'
import { formatPercent } from '@/lib/format'
import { formatPeriodLabel } from '@/lib/period'
import { PeriodSwitcher } from './revenueShared'
import { usePeriodParam } from './usePeriod'

export function RevenuePropertyBuildingPage() {
  const { zoneId = '', buildingId = '' } = useParams()
  const scoped = useScopedData()
  const period = usePeriodParam()
  const navigate = useNavigate()

  const zone = scoped.zones.find((z) => z.id === zoneId)
  const building = scoped.buildings.find((b) => b.id === buildingId)
  const rows = useMemo(() => getCompanyDrillRows(scoped, buildingId, period), [scoped, buildingId, period])

  if (!zone || !building || rows.length === 0) return <Navigate to="/property/revenue/property" replace />

  const receivable = rows.reduce((s, r) => s + r.receivable, 0)
  const achieved = rows.reduce((s, r) => s + r.achieved, 0)
  const rate = receivable === 0 ? 1 : achieved / receivable
  const query = `?kind=${period.kind}&key=${period.key}`

  return (
    <div className="space-y-4">
      <DrillBreadcrumb
        items={[
          { label: '物业服务收费', to: `/property/revenue/property${query}` },
          { label: zone.name, to: `/property/revenue/property/${zoneId}${query}` },
          { label: building.no },
        ]}
      />
      <PageHeader
        title={`${building.no} · 物业服务收费`}
        description={`${formatPeriodLabel(period)} · ${rows.length} 家入驻企业,点击行进入企业档案`}
      >
        <PeriodSwitcher period={period} />
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard title="期间应收" value={formatWan(receivable)} icon={Wallet} sub={`${rows.length} 家企业`} />
        <KpiCard title="达成(实收)" value={formatWan(achieved)} icon={Building2} sub={`未收 ${formatWan(receivable - achieved)}`} />
        <KpiCard title="收缴率" value={formatPercent(rate)} icon={Percent} alert={rate < 0.88} alertText="低于 88%,需关注" />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">企业收费达成(点击行进入企业档案)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>企业</TableHead>
                <TableHead>入驻位置</TableHead>
                <TableHead className="text-right">面积</TableHead>
                <TableHead className="text-right">期间应收</TableHead>
                <TableHead className="text-right">达成(实收)</TableHead>
                <TableHead className="text-right">收缴率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.company.id} className="cursor-pointer" onClick={() => navigate(`/property/companies/${row.company.id}`)}>
                  <TableCell className="font-medium">{row.company.name}</TableCell>
                  <TableCell>
                    {row.company.occupancy.type === 'whole' ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        整栋独占
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{row.company.occupancy.unitLabel}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.company.areaSqm.toLocaleString()}㎡</TableCell>
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
