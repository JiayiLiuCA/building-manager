import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/shared/ChartCard'
import { KpiCard } from '@/components/shared/KpiCard'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CURRENT_MONTH } from '@/lib/date'
import {
  getCloseRate,
  getCompletionOnTimeRate,
  getMonthlyWoStats,
  getMonthWorkOrders,
  getResponseOnTimeRate,
  getWoCategoryDist,
} from '@/data/selectors/workOrderSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { monthTick } from '@/lib/charts'
import { formatPercent } from '@/lib/format'
import { workOrderCategoryMap } from '@/lib/statusMaps'

const seriesConfig = {
  companyCount: { label: '企业报事报修', color: 'var(--chart-1)' },
  publicCount: { label: '公共区域维修', color: 'var(--chart-5)' },
} satisfies ChartConfig

const distConfig = { count: { label: '工单数', color: 'var(--chart-2)' } } satisfies ChartConfig

/** 月度集成分析:本月与近 12 月整体维修数据(量 / 及时性 / 关单率 / 类型分布) */
export function MonthlyAnalysis() {
  const scoped = useScopedData()
  const monthly = useMemo(() => getMonthlyWoStats(scoped, 12), [scoped])
  const monthWos = useMemo(() => getMonthWorkOrders(scoped, CURRENT_MONTH), [scoped])
  const dist = useMemo(() => getWoCategoryDist(scoped.workOrders), [scoped])

  return (
    <div className="mt-2 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="本月工单量" value={`${monthWos.length} 张`} sub={`企业 ${monthWos.filter((w) => w.kind === 'company').length} / 公共 ${monthWos.filter((w) => w.kind === 'public').length}`} />
        <KpiCard title="本月响应及时率" value={formatPercent(getResponseOnTimeRate(monthWos))} sub="4 小时内接单" />
        <KpiCard title="本月完成及时率" value={formatPercent(getCompletionOnTimeRate(monthWos))} sub="48 小时内完工" />
        <KpiCard title="本月关单率" value={formatPercent(getCloseRate(monthWos))} sub="已关单 / 全部" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="近 12 月工单量(按类型)"
          description="柱上常显合计,分类型数字见下表"
          table={
            <div className="max-h-40 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">企业报修</TableHead>
                    <TableHead className="text-right">公共维修</TableHead>
                    <TableHead className="text-right">关单率</TableHead>
                    <TableHead className="text-right">响应及时率</TableHead>
                    <TableHead className="text-right">完成及时率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...monthly].reverse().map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.month}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.companyCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.publicCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(m.closeRate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(m.responseRate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(m.completionRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        >
          <ChartContainer config={seriesConfig} className="h-full w-full">
            <BarChart data={monthly} margin={{ top: 22 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={monthTick} tickLine={false} axisLine={false} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="companyCount" stackId="a" fill="var(--color-companyCount)" radius={[0, 0, 4, 4]} />
              <Bar dataKey="publicCount" stackId="a" fill="var(--color-publicCount)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" className="fill-foreground" fontSize={10} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="维修类别分布(近 12 月)"
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类别</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dist.map((d) => (
                  <TableRow key={d.category}>
                    <TableCell>{workOrderCategoryMap[d.category]}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <ChartContainer config={distConfig} className="h-full w-full">
            <BarChart
              data={dist.map((d) => ({ ...d, label: workOrderCategoryMap[d.category] }))}
              layout="vertical"
              margin={{ left: 12, right: 36 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={72} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </div>
  )
}
