import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getMonthlyAchievementSeries, getPeriodAchievement, getZoneDrillRows } from '@/data/selectors/revenueSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { rateTextClass } from '@/lib/charts'
import { formatPercent } from '@/lib/format'
import { formatPeriodLabel } from '@/lib/period'
import { AchievementKpiRow, PeriodSwitcher, RevenueTrendCard } from './revenueShared'
import { usePeriodParam } from './usePeriod'

export function RevenuePropertyPage() {
  const scoped = useScopedData()
  const period = usePeriodParam()
  const navigate = useNavigate()

  const achievement = useMemo(() => getPeriodAchievement(scoped, 'property', period), [scoped, period])
  const series = useMemo(() => getMonthlyAchievementSeries(scoped, 'property'), [scoped])
  const zoneRows = useMemo(() => getZoneDrillRows(scoped, period), [scoped, period])

  return (
    <div className="space-y-4">
      <PageHeader title="物业服务收费" description={`${formatPeriodLabel(period)}收费达成与下钻(园区 → 区 → 楼栋 → 企业)`}>
        <PeriodSwitcher period={period} />
      </PageHeader>

      <AchievementKpiRow achievement={achievement} period={period} />
      <RevenueTrendCard series={series} />

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">按区下钻(点击行进入区内楼栋)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>区域</TableHead>
                <TableHead className="text-right">入驻企业</TableHead>
                <TableHead className="text-right">期间应收</TableHead>
                <TableHead className="text-right">达成(实收)</TableHead>
                <TableHead className="text-right">收缴率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zoneRows.map((row) => (
                <TableRow
                  key={row.zone.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/property/revenue/property/${row.zone.id}?kind=${period.kind}&key=${period.key}`)}
                >
                  <TableCell className="font-medium">{row.zone.name}</TableCell>
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
