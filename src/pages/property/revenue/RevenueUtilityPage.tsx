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
import { utilitySubMap } from '@/lib/statusMaps'
import type { UtilitySub } from '@/data/types'
import { AchievementKpiRow, PeriodSwitcher, SubTypeTrendCard } from './revenueShared'
import { usePeriodParam } from './usePeriod'

const SUBS: UtilitySub[] = ['water', 'electricity']

export function RevenueUtilityPage() {
  const scoped = useScopedData()
  const period = usePeriodParam()

  const achievement = useMemo(() => getPeriodAchievement(scoped, 'utility', period), [scoped, period])
  const subRows = useMemo(
    () => SUBS.map((sub) => ({ sub, ...getSubTypeAchievement(scoped, 'utility', sub, period) })),
    [scoped, period],
  )
  const series = useMemo(() => getSubTypeMonthlySeries(scoped, 'utility', SUBS), [scoped])

  return (
    <div className="space-y-4">
      <PageHeader title="水电能耗收费" description={`${formatPeriodLabel(period)} · 购水 / 购电 两口径`}>
        <PeriodSwitcher period={period} />
      </PageHeader>

      <AchievementKpiRow achievement={achievement} period={period} />

      <div className="grid gap-3 sm:grid-cols-2">
        {subRows.map((row) => (
          <KpiCard
            key={row.sub}
            title={`${utilitySubMap[row.sub]}收费`}
            value={formatWan(row.achieved)}
            sub={`期间应收 ${formatWan(row.receivable)}`}
          />
        ))}
      </div>

      <SubTypeTrendCard
        title="购水 / 购电收费趋势(近 12 月)"
        series={series}
        subs={SUBS.map((sub) => ({ key: sub, label: utilitySubMap[sub] }))}
      />
    </div>
  )
}
