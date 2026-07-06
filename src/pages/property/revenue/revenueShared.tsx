import { CreditCard, Percent, TrendingUp, Wallet } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/shared/ChartCard'
import { KpiCard } from '@/components/shared/KpiCard'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Achievement, MonthAchievementPoint } from '@/data/selectors/revenueSelectors'
import { formatWan, moneyLabelFormatter, monthTick, rateTextClass } from '@/lib/charts'
import { formatPercent } from '@/lib/format'
import {
  defaultPeriodKey,
  monthsInPeriod,
  periodOptions,
  type Period,
  type PeriodKind,
} from '@/lib/period'

// 经营管理四页共用骨架小件:期间切换 / 达成 KPI 行 / 达成趋势卡。
// 页面自组装,不做大插槽框架。

/** 年 / 季 / 月维度切换 + 期间选择;状态走 URL,切维度时期间重置为该维度默认值 */
export function PeriodSwitcher({ period }: { period: Period }) {
  const [params, setParams] = useSearchParams()

  const setKind = (kind: string) => {
    const next = new URLSearchParams(params)
    next.set('kind', kind)
    next.set('key', defaultPeriodKey(kind as PeriodKind))
    setParams(next, { replace: true })
  }
  const setKey = (key: string) => {
    const next = new URLSearchParams(params)
    next.set('key', key)
    setParams(next, { replace: true })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs value={period.kind} onValueChange={setKind}>
        <TabsList>
          <TabsTrigger value="year">年度</TabsTrigger>
          <TabsTrigger value="quarter">季度</TabsTrigger>
          <TabsTrigger value="month">月度</TabsTrigger>
        </TabsList>
      </Tabs>
      <Select value={period.key} onValueChange={setKey}>
        <SelectTrigger className="w-44" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions(period.kind).map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** 达成 KPI 行:达成金额 / 目标金额 / 达成率 / 期间应收;不满全期时标注统计口径 */
export function AchievementKpiRow({ achievement, period }: { achievement: Achievement; period: Period }) {
  const months = monthsInPeriod(period)
  const full = period.kind === 'year' ? 12 : period.kind === 'quarter' ? 3 : 1
  const partialNote =
    months.length > 0 && months.length < full ? `统计口径 ${months[0]} ~ ${months[months.length - 1]}` : undefined

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="达成金额(实收)"
        value={formatWan(achievement.achieved)}
        icon={Wallet}
        sub={partialNote ?? '期间内实收合计'}
      />
      <KpiCard title="目标金额" value={formatWan(achievement.target)} icon={TrendingUp} sub={partialNote ?? '期间月目标之和'} />
      <KpiCard
        title="达成率"
        value={formatPercent(achievement.rate)}
        icon={Percent}
        alert={achievement.rate < 0.88}
        alertText="低于 88%,需关注"
        sub={achievement.rate >= 1 ? '已超额完成目标' : '达成 / 目标'}
      />
      <KpiCard
        title="期间应收"
        value={formatWan(achievement.receivable)}
        icon={CreditCard}
        sub={`未收 ${formatWan(Math.max(0, achievement.receivable - achievement.achieved))}`}
      />
    </div>
  )
}

const trendConfig = {
  achieved: { label: '达成(实收)', color: 'var(--chart-2)' },
  target: { label: '目标', color: 'var(--chart-1)' },
} satisfies ChartConfig

/** 近 12 月达成 vs 目标趋势(达成数值常显 + 明细表) */
export function RevenueTrendCard({ title = '达成趋势(近 12 月)', series }: { title?: string; series: MonthAchievementPoint[] }) {
  return (
    <ChartCard
      title={title}
      description="达成(实收)vs 目标;达成数值常显,完整数字见下表"
      table={
        <div className="max-h-36 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>月份</TableHead>
                <TableHead className="text-right">达成</TableHead>
                <TableHead className="text-right">目标</TableHead>
                <TableHead className="text-right">达成率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...series].reverse().map((p) => (
                <TableRow key={p.month}>
                  <TableCell>{p.month}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatWan(p.achieved)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatWan(p.target)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${rateTextClass(p.target === 0 ? 1 : p.achieved / p.target)}`}>
                    {p.target === 0 ? '—' : formatPercent(p.achieved / p.target)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    >
      <ChartContainer config={trendConfig} className="h-full w-full">
        <BarChart data={series} margin={{ top: 22 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={monthTick} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickFormatter={(v: number) => moneyLabelFormatter(v)} tickLine={false} axisLine={false} fontSize={11} width={52} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="target" fill="var(--color-target)" radius={3} />
          <Bar dataKey="achieved" fill="var(--color-achieved)" radius={3}>
            <LabelList dataKey="achieved" position="top" formatter={moneyLabelFormatter} className="fill-foreground" fontSize={9} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

interface SubSeriesDef {
  key: string
  label: string
}

const SUB_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

/** 分口径堆叠趋势卡(车辆三口径 / 水电两口径 / 增值三类型):顶部常显合计数值 + 明细表 */
export function SubTypeTrendCard({
  title,
  series,
  subs,
}: {
  title: string
  series: { month: string; values: Record<string, number>; total: number }[]
  subs: SubSeriesDef[]
}) {
  const config = Object.fromEntries(
    subs.map((sub, i) => [sub.key, { label: sub.label, color: SUB_COLORS[i % SUB_COLORS.length] }]),
  ) satisfies ChartConfig
  const data = series.map((p) => ({ month: p.month, total: p.total, ...p.values }))

  return (
    <ChartCard
      title={title}
      description="分口径堆叠;柱顶常显合计,分口径数字见下表"
      table={
        <div className="max-h-36 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>月份</TableHead>
                {subs.map((sub) => (
                  <TableHead key={sub.key} className="text-right">
                    {sub.label}
                  </TableHead>
                ))}
                <TableHead className="text-right">合计</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...series].reverse().map((p) => (
                <TableRow key={p.month}>
                  <TableCell>{p.month}</TableCell>
                  {subs.map((sub) => (
                    <TableCell key={sub.key} className="text-right tabular-nums">
                      {formatWan(p.values[sub.key] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">{formatWan(p.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    >
      <ChartContainer config={config} className="h-full w-full">
        <BarChart data={data} margin={{ top: 22 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={monthTick} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickFormatter={(v: number) => moneyLabelFormatter(v)} tickLine={false} axisLine={false} fontSize={11} width={52} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {subs.map((sub, i) => (
            <Bar key={sub.key} dataKey={sub.key} stackId="rev" fill={`var(--color-${sub.key})`} radius={i === subs.length - 1 ? 3 : 0}>
              {i === subs.length - 1 && (
                <LabelList dataKey="total" position="top" formatter={moneyLabelFormatter} className="fill-foreground" fontSize={9} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
