import { useMemo } from 'react'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  getPeriodAchievement,
  getSubTypeAchievement,
  getSubTypeMonthlySeries,
} from '@/data/selectors/revenueSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatWan } from '@/lib/charts'
import { formatPeriodLabel } from '@/lib/period'
import { vehicleSubMap } from '@/lib/statusMaps'
import type { VehicleSub } from '@/data/types'
import { AchievementKpiRow, PeriodSwitcher, SubTypeTrendCard } from './revenueShared'
import { usePeriodParam } from './usePeriod'

const SUBS: VehicleSub[] = ['fixed', 'temporary', 'leased']

export function RevenueVehiclePage() {
  const scoped = useScopedData()
  const period = usePeriodParam()

  const achievement = useMemo(() => getPeriodAchievement(scoped, 'vehicle', period), [scoped, period])
  const subRows = useMemo(
    () => SUBS.map((sub) => ({ sub, ...getSubTypeAchievement(scoped, 'vehicle', sub, period) })),
    [scoped, period],
  )
  const series = useMemo(() => getSubTypeMonthlySeries(scoped, 'vehicle', SUBS), [scoped])
  const isCs = scoped.currentUser?.role === 'cs'

  return (
    <div className="space-y-4">
      <PageHeader
        title="车辆服务收费"
        description={`${formatPeriodLabel(period)} · 固定车位 / 临时停放 / 租赁车位 三口径`}
      >
        <PeriodSwitcher period={period} />
      </PageHeader>

      <AchievementKpiRow achievement={achievement} period={period} />

      <div className="grid gap-3 sm:grid-cols-3">
        {subRows.map((row) => (
          <KpiCard
            key={row.sub}
            title={vehicleSubMap[row.sub]}
            value={formatWan(row.achieved)}
            sub={
              row.sub === 'temporary' && isCs && row.receivable === 0
                ? '园区级收入,主管视角可见'
                : `期间应收 ${formatWan(row.receivable)}`
            }
          />
        ))}
      </div>

      <SubTypeTrendCard
        title="三口径收入趋势(近 12 月)"
        series={series}
        subs={SUBS.map((sub) => ({ key: sub, label: vehicleSubMap[sub] }))}
      />
    </div>
  )
}
