import { BadgePercent, Banknote, DoorOpen, Smile, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { AiSummaryCard } from '@/components/shared/AiSummaryCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { RiskList } from '@/components/shared/RiskList'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { COLLECTION_TARGET } from '@/data/constants'
import { DASHBOARD_AI_SUMMARY } from '@/data/mock-content/aiSummaries'
import { getCollectionTrend, getCommunityCollection } from '@/data/selectors/billingSelectors'
import {
  getDashboardKpis,
  getRiskList,
  getSatisfactionDist,
  getWorkOrderStatusDist,
} from '@/data/selectors/dashboardSelectors'
import { useAppStore } from '@/data/store'
import { DEMO_TODAY } from '@/lib/date'
import { formatCurrency, formatPercent } from '@/lib/format'

const trendConfig = {
  ratePct: { label: '收缴率', color: 'var(--chart-1)' },
} satisfies ChartConfig

const communityConfig = {
  receivable: { label: '应收', color: 'var(--chart-1)' },
  received: { label: '实收', color: 'var(--chart-2)' },
} satisfies ChartConfig

const woDistConfig = {
  pending: { label: '待派单', color: 'var(--chart-3)' },
  in_progress: { label: '处理中', color: 'var(--chart-1)' },
  done: { label: '已完成', color: 'var(--chart-2)' },
  overdue: { label: '超时', color: 'var(--chart-4)' },
} satisfies ChartConfig

const satisfactionConfig = {
  count: { label: '评价数', color: 'var(--chart-5)' },
} satisfies ChartConfig

export function DashboardPage() {
  const state = useAppStore()

  const kpis = useMemo(() => getDashboardKpis(state), [state])
  const trend = useMemo(
    () => getCollectionTrend(state).map((t) => ({ ...t, ratePct: +(t.rate * 100).toFixed(1) })),
    [state],
  )
  const communityData = useMemo(() => getCommunityCollection(state), [state])
  const woDist = useMemo(() => getWorkOrderStatusDist(state), [state])
  const woTotal = useMemo(() => woDist.reduce((s, d) => s + d.value, 0), [woDist])
  const satisfaction = useMemo(() => getSatisfactionDist(state), [state])
  const risks = useMemo(() => getRiskList(state), [state])

  const collectionAlert = kpis.collectionRate < COLLECTION_TARGET

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="驾驶舱" description={`经营总览 · ${DEMO_TODAY}`}>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          演示数据 · 刷新即重置
        </Badge>
      </PageHeader>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          title="物业费收缴率(本月)"
          value={formatPercent(kpis.collectionRate)}
          icon={BadgePercent}
          alert={collectionAlert}
          alertText={`低于目标 ${formatPercent(COLLECTION_TARGET, 0)}`}
          sub={`目标 ≥ ${formatPercent(COLLECTION_TARGET, 0)}`}
        />
        <KpiCard
          title="本月实收 / 应收"
          value={formatCurrency(kpis.received)}
          sub={`应收 ${formatCurrency(kpis.receivable)}`}
          icon={Banknote}
        />
        <KpiCard title="空置率" value={formatPercent(kpis.vacancyRate)} sub="空置户物业费按半价计收" icon={DoorOpen} />
        <KpiCard title="维修及时率" value={formatPercent(kpis.onTimeRate)} sub="时效承诺 48 小时" icon={Timer} />
        <KpiCard
          title="投诉满意率"
          value={formatPercent(kpis.complaintSatisfaction)}
          sub="一次性解决(未升级主管)占比"
          icon={Smile}
        />
      </div>

      {/* 图表区 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="收缴率趋势" description="近 12 个月,目标线 90%">
          <ChartContainer config={trendConfig} className="aspect-auto h-full w-full">
            <LineChart data={trend} margin={{ left: -10, right: 10, top: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={(m: string) => `${Number(m.slice(5))}月`}
              />
              <YAxis
                domain={[80, 100]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => String(payload?.[0]?.payload?.month ?? '')}
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">收缴率</span>
                        <span className="font-mono font-medium tabular-nums">{value}%</span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey="ratePct"
                type="monotone"
                stroke="var(--color-ratePct)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-ratePct)' }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="各小区收缴对比" description="本月应收 / 实收(元)">
          <ChartContainer config={communityConfig} className="aspect-auto h-full w-full">
            <BarChart data={communityData} margin={{ left: 0, right: 10, top: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v: number) => `${(v / 10000).toFixed(1)}万`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {communityConfig[name as keyof typeof communityConfig]?.label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="receivable" fill="var(--color-receivable)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="工单状态分布" description="超时工单需优先处理">
          <ChartContainer config={woDistConfig} className="aspect-auto h-full w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
              <Pie data={woDist} dataKey="value" nameKey="key" innerRadius={55} outerRadius={85} strokeWidth={2}>
                {woDist.map((d) => (
                  <Cell key={d.key} fill={`var(--color-${d.key})`} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                            {woTotal}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                            总工单
                          </tspan>
                        </text>
                      )
                    }
                    return null
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="业主满意度分布" description="已评价工单的 1-5 星分布">
          <ChartContainer config={satisfactionConfig} className="aspect-auto h-full w-full">
            <BarChart data={satisfaction} margin={{ left: -20, right: 10, top: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="rating" tickLine={false} axisLine={false} tickMargin={6} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      {/* 风险清单 + AI 摘要 */}
      <div className="mt-4 space-y-4">
        <RiskList items={risks} />
        <AiSummaryCard summary={DASHBOARD_AI_SUMMARY} />
      </div>
    </div>
  )
}
