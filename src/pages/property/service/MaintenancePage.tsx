import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/shared/ChartCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  deriveMaintenanceStatus,
  getMaintenanceStats,
  getMonthlyMaintenanceStats,
  getMonthMaintenance,
} from '@/data/selectors/maintenanceSelectors'
import { useScopedInternal } from '@/hooks/useScopedData'
import { CURRENT_MONTH } from '@/lib/date'
import { monthTick } from '@/lib/charts'
import { formatDateTime, formatPercent } from '@/lib/format'
import { maintenanceCategoryMap, maintenanceStatusMap } from '@/lib/statusMaps'
import type { MaintenanceCategory } from '@/data/types'

const PAGE_SIZE = 10

const seriesConfig = {
  planned: { label: '计划', color: 'var(--chart-1)' },
  executed: { label: '已执行', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function MaintenancePage() {
  const internal = useScopedInternal()
  const [category, setCategory] = useState<'all' | MaintenanceCategory>('all')
  const [page, setPage] = useState(1)

  const orders = useMemo(
    () => internal.maintenanceOrders.filter((o) => category === 'all' || o.category === category),
    [internal.maintenanceOrders, category],
  )
  const monthOrders = useMemo(() => getMonthMaintenance(orders, CURRENT_MONTH), [orders])
  const monthStats = useMemo(() => getMaintenanceStats(monthOrders), [monthOrders])
  const monthly = useMemo(
    () => getMonthlyMaintenanceStats(orders, 12, category === 'all' ? undefined : category),
    [orders, category],
  )

  const rows = useMemo(
    () => [...orders].sort((a, b) => b.plannedAt.localeCompare(a.plannedAt)),
    [orders],
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader
        title="维保工单"
        description="消防维保 / 电梯维保 / 日常维保 · 基于维保计划(计划时间 vs 实际执行) · 月度集成分析"
      >
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v as 'all' | MaintenanceCategory)
            setPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类别</SelectItem>
            {(Object.keys(maintenanceCategoryMap) as MaintenanceCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {maintenanceCategoryMap[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="本月计划" value={`${monthStats.total} 项`} sub={`已执行 ${monthStats.executed} 项`} />
        <KpiCard title="本月计划完成率" value={formatPercent(monthStats.completionRate)} sub="已执行 / 应执行(计划已到期)" />
        <KpiCard title="执行及时率" value={formatPercent(monthStats.onTimeRate)} sub="计划时间 24h 内执行" />
        <KpiCard
          title="超期未执行"
          value={`${monthStats.overdue} 项`}
          alert={monthStats.overdue > 0}
          alertText="存在超期维保,需督办"
          sub="计划已过未执行"
        />
      </div>

      <ChartCard
        title="近 12 月维保执行(计划 vs 实际)"
        description="柱上常显数值;及时率 / 完成率见下表"
        table={
          <div className="max-h-40 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月份</TableHead>
                  <TableHead className="text-right">计划</TableHead>
                  <TableHead className="text-right">已执行</TableHead>
                  <TableHead className="text-right">计划完成率</TableHead>
                  <TableHead className="text-right">及时率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...monthly].reverse().map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{m.month}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.planned}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.executed}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(m.completionRate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(m.onTimeRate)}</TableCell>
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
            <Bar dataKey="planned" fill="var(--color-planned)" radius={4}>
              <LabelList dataKey="planned" position="top" className="fill-foreground" fontSize={10} />
            </Bar>
            <Bar dataKey="executed" fill="var(--color-executed)" radius={4}>
              <LabelList dataKey="executed" position="top" className="fill-foreground" fontSize={10} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <Card className="py-0">
        <CardContent className="p-0">
          {pageRows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="暂无维保记录" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">单号</TableHead>
                  <TableHead>类别</TableHead>
                  <TableHead>维保内容</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>计划时间</TableHead>
                  <TableHead>实际执行</TableHead>
                  <TableHead>执行方</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((o) => {
                  const status = deriveMaintenanceStatus(o)
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="pl-4 font-mono text-xs">{o.id}</TableCell>
                      <TableCell>
                        <StatusBadge meta={maintenanceCategoryMap[o.category]} />
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="truncate text-sm">{o.title}</p>
                        {o.result === 'issue' && <p className="text-xs text-amber-600">执行发现问题,已登记跟进</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.location}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(o.plannedAt)}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(o.executedAt)}</TableCell>
                      <TableCell className="text-sm">{o.executantName}</TableCell>
                      <TableCell>
                        <StatusBadge meta={maintenanceStatusMap[status]} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <SimplePagination page={safePage} pageCount={pageCount} total={rows.length} onChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
