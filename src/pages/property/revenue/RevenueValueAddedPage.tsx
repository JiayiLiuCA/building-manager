import { useMemo } from 'react'
import { Link } from 'react-router'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getPeriodAchievement,
  getSubTypeAchievement,
  getSubTypeMonthlySeries,
} from '@/data/selectors/revenueSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatWan } from '@/lib/charts'
import { formatPeriodLabel } from '@/lib/period'
import { valueAddedTypeMap } from '@/lib/statusMaps'
import type { ValueAddedType } from '@/data/types'
import { AchievementKpiRow, PeriodSwitcher, SubTypeTrendCard } from './revenueShared'
import { usePeriodParam } from './usePeriod'

const TYPES: ValueAddedType[] = ['home_service', 'asset_ops', 'retail']

export function RevenueValueAddedPage() {
  const scoped = useScopedData()
  const period = usePeriodParam()

  const achievement = useMemo(() => getPeriodAchievement(scoped, 'valueAdded', period), [scoped, period])
  const subRows = useMemo(
    () => TYPES.map((sub) => ({ sub, ...getSubTypeAchievement(scoped, 'valueAdded', sub, period) })),
    [scoped, period],
  )
  const series = useMemo(() => getSubTypeMonthlySeries(scoped, 'valueAdded', TYPES), [scoped])
  const contracts = useMemo(
    () => [...scoped.valueAddedContracts].sort((a, b) => b.monthlyAmount - a.monthlyAmount),
    [scoped],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="增值服务收入"
        description={`${formatPeriodLabel(period)} · 按合同类型:到家服务 / 资产运营 / 零售服务`}
      >
        <PeriodSwitcher period={period} />
      </PageHeader>

      <AchievementKpiRow achievement={achievement} period={period} />

      <div className="grid gap-3 sm:grid-cols-3">
        {subRows.map((row) => (
          <KpiCard
            key={row.sub}
            title={valueAddedTypeMap[row.sub]}
            value={formatWan(row.achieved)}
            sub={`期间应收 ${formatWan(row.receivable)}`}
          />
        ))}
      </div>

      <SubTypeTrendCard
        title="分业务收入趋势(近 12 月)"
        series={series}
        subs={TYPES.map((sub) => ({ key: sub, label: valueAddedTypeMap[sub] }))}
      />

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">增值服务合同({contracts.length} 份)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合同</TableHead>
                <TableHead>企业</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">月费</TableHead>
                <TableHead className="text-right">合同期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const company = scoped.companies.find((c) => c.id === contract.companyId)
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.name}</TableCell>
                    <TableCell>
                      {company ? (
                        <Link className="text-primary hover:underline" to={`/property/companies/${company.id}`}>
                          {company.name}
                        </Link>
                      ) : (
                        contract.companyId
                      )}
                    </TableCell>
                    <TableCell>{valueAddedTypeMap[contract.type]}</TableCell>
                    <TableCell className="text-right tabular-nums">¥{contract.monthlyAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {contract.start} ~ {contract.end}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
