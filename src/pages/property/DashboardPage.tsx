import { ChevronDown, CircleAlert, CircleCheck, ClipboardList, Percent, Smile, Wallet, Wrench } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import { AiSummaryCard } from '@/components/shared/AiSummaryCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { COLLECTION_TARGET } from '@/data/constants'
import { buildDashboardAiSummary } from '@/data/mock-content/aiSummaries'
import {
  getArrearsOverview,
  getBuildingCollectionTable,
  getCollectionTrend,
  getCsCollectionTable,
} from '@/data/selectors/billingSelectors'
import { getDashboardKpis, getWorkOrderStatusDist, getZoneCompare } from '@/data/selectors/dashboardSelectors'
import { getFollowUpRows } from '@/data/selectors/followUpSelectors'
import { getRatingDist } from '@/data/selectors/satisfactionSelectors'
import { getOpenOverdueWorkOrders } from '@/data/selectors/workOrderSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatWan, moneyLabel, moneyLabelFormatter, monthTick, rateTextClass } from '@/lib/charts'
import { formatPercent } from '@/lib/format'
import { followUpSuggestionMap } from '@/lib/statusMaps'

const trendConfig = {
  receivable: { label: '应收', color: 'var(--chart-1)' },
  received: { label: '实收', color: 'var(--chart-2)' },
} satisfies ChartConfig

const zoneConfig = trendConfig

const woConfig = { count: { label: '工单数', color: 'var(--chart-1)' } } satisfies ChartConfig

const ratingConfig = { count: { label: '评价数', color: 'var(--chart-3)' } } satisfies ChartConfig

export function DashboardPage() {
  const scoped = useScopedData()

  const kpis = useMemo(() => getDashboardKpis(scoped), [scoped])
  const trend = useMemo(() => getCollectionTrend(scoped, 12), [scoped])
  const zoneRows = useMemo(() => getZoneCompare(scoped), [scoped])
  const woDist = useMemo(() => getWorkOrderStatusDist(scoped), [scoped])
  const ratingDist = useMemo(() => getRatingDist(scoped), [scoped])
  const buildingTable = useMemo(() => getBuildingCollectionTable(scoped), [scoped])
  const csTable = useMemo(() => getCsCollectionTable(scoped), [scoped])
  const arrears = useMemo(() => getArrearsOverview(scoped), [scoped])
  const followUps = useMemo(() => getFollowUpRows(scoped), [scoped])
  const overdueWos = useMemo(() => getOpenOverdueWorkOrders(scoped), [scoped])

  const scopeLabel = scoped.currentUser?.role === 'supervisor' ? '全园区' : `名下 ${scoped.companies.length} 家企业`
  const aiSummary = useMemo(
    () =>
      buildDashboardAiSummary({
        displayName: scoped.currentUser?.displayName ?? '',
        scopeLabel,
        kpis,
        arrears,
        followUps,
        overdueWoCount: overdueWos.length,
      }),
    [scoped.currentUser?.displayName, scopeLabel, kpis, arrears, followUps, overdueWos.length],
  )

  const woTotal = woDist.reduce((s, b) => s + b.count, 0)
  const followUpTop = followUps.slice(0, 4)

  return (
    <div className="space-y-4">
      <PageHeader
        title="驾驶舱"
        description={`${scopeLabel} · 2026 年 6 月经营总览(所有数字按当前账号可见范围实时聚合)`}
      />

      {/* ===== KPI ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="本月应收" value={formatWan(kpis.receivable)} icon={Wallet} sub="四费类账单合计" />
        <KpiCard title="本月实收" value={formatWan(kpis.received)} icon={Wallet} sub={`未收 ${formatWan(kpis.receivable - kpis.received)}`} />
        <KpiCard
          title="本月收缴率"
          value={formatPercent(kpis.collectionRate)}
          icon={Percent}
          alert={kpis.collectionRate < COLLECTION_TARGET}
          alertText={`低于目标 ${formatPercent(COLLECTION_TARGET, 0)}`}
          sub={`目标 ${formatPercent(COLLECTION_TARGET, 0)}`}
        />
        <KpiCard
          title="费用减免(本月)"
          value={`¥${kpis.waiverMonth.toLocaleString()}`}
          icon={ClipboardList}
          sub={`年度累计 ¥${kpis.waiverYear.toLocaleString()} · 占应收 ${formatPercent(kpis.waiverRatio)}`}
        />
        <KpiCard title="本月工单" value={`${kpis.woNew} 张`} icon={Wrench} sub={`关单率 ${formatPercent(kpis.woCloseRate)}`} />
        <KpiCard title="整体满意度" value={`${kpis.satisfaction.toFixed(1)} 分`} icon={Smile} sub="报修评价 + 调研双来源" />
      </div>

      {/* ===== 欠费(弱化:次要紧凑折叠卡)===== */}
      <Collapsible>
        <Card className="py-0">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent/40">
            <span className="text-muted-foreground">欠费数据(历史 + 当期)</span>
            <span className="font-medium tabular-nums">¥{arrears.totalAmount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">涉及 {arrears.companyCount} 家企业 · 点击展开明细</span>
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 py-3">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>企业</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead className="text-right">欠费金额</TableHead>
                    <TableHead className="text-right">涉及月数</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrears.rows.map(({ company, arrears: a }) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.zoneId} 区 {company.buildingId} 栋
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">¥{a.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.months} 个月</TableCell>
                      <TableCell className="text-right">
                        <Link className="text-primary hover:underline" to={`/property/companies/${company.id}`}>
                          企业档案
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===== 四张图(常显数值 + 明细小表)===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="收费趋势(近 12 月)"
          description="应收 vs 实收;实收数值常显,完整数字见下表"
          table={
            <div className="max-h-36 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">应收</TableHead>
                    <TableHead className="text-right">实收</TableHead>
                    <TableHead className="text-right">收缴率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...trend].reverse().map((t) => (
                    <TableRow key={t.month}>
                      <TableCell>{t.month}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatWan(t.receivable)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatWan(t.received)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${rateTextClass(t.rate)}`}>{formatPercent(t.rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        >
          <ChartContainer config={trendConfig} className="h-full w-full">
            <LineChart data={trend} margin={{ top: 22, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={monthTick} tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickFormatter={moneyLabel} tickLine={false} axisLine={false} fontSize={11} width={52} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="receivable" stroke="var(--color-receivable)" strokeWidth={2} dot={false} />
              <Line dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={{ r: 2.5 }}>
                <LabelList dataKey="received" position="top" formatter={moneyLabelFormatter} className="fill-foreground" fontSize={9} />
              </Line>
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="收缴对比(按区)"
          description="本月应收 / 实收,柱上直接标数值"
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>区域</TableHead>
                  <TableHead className="text-right">应收</TableHead>
                  <TableHead className="text-right">实收</TableHead>
                  <TableHead className="text-right">收缴率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zoneRows.map((z) => (
                  <TableRow key={z.zoneId}>
                    <TableCell>{z.zoneName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatWan(z.receivable)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatWan(z.received)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${rateTextClass(z.rate)}`}>{formatPercent(z.rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <ChartContainer config={zoneConfig} className="h-full w-full">
            <BarChart data={zoneRows} margin={{ top: 22 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="zoneName" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={moneyLabel} tickLine={false} axisLine={false} fontSize={11} width={52} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="receivable" fill="var(--color-receivable)" radius={4}>
                <LabelList dataKey="receivable" position="top" formatter={moneyLabelFormatter} className="fill-foreground" fontSize={10} />
              </Bar>
              <Bar dataKey="received" fill="var(--color-received)" radius={4}>
                <LabelList dataKey="received" position="top" formatter={moneyLabelFormatter} className="fill-foreground" fontSize={10} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="工单状态分布"
          description={`共 ${woTotal} 张(近 12 月,含公共区域维修)`}
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">占比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {woDist.map((b) => (
                  <TableRow key={b.key}>
                    <TableCell>{b.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{woTotal ? formatPercent(b.count / woTotal) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <ChartContainer config={woConfig} className="h-full w-full">
            <BarChart data={woDist} layout="vertical" margin={{ left: 8, right: 36 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={64} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="企业满意度分布"
          description="报修关单评价星级(近 12 月)"
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>星级</TableHead>
                  <TableHead className="text-right">评价数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...ratingDist].reverse().map((d) => (
                  <TableRow key={d.star}>
                    <TableCell>{d.star} 星</TableCell>
                    <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <ChartContainer config={ratingConfig} className="h-full w-full">
            <BarChart data={ratingDist.map((d) => ({ ...d, label: `${d.star} 星` }))} margin={{ top: 22 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      {/* ===== 缴费收款板块:楼栋收缴率表(区分组 + 小计 + 总计)+ 客服个人收缴率表 ===== */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="py-0 xl:col-span-3">
          <CardHeader className="border-b py-3!">
            <CardTitle className="text-sm font-medium">按楼栋收缴率(本月,按区分组)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>楼栋</TableHead>
                  <TableHead className="text-right">入驻企业</TableHead>
                  <TableHead className="text-right">应收</TableHead>
                  <TableHead className="text-right">实收</TableHead>
                  <TableHead className="text-right">收缴率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildingTable.groups.map((group) => (
                  <Fragment key={group.zoneId}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={5} className="py-1.5 text-xs font-semibold text-muted-foreground">
                        {group.zoneName}
                      </TableCell>
                    </TableRow>
                    {group.rows.map((row) => (
                      <TableRow key={row.building.id}>
                        <TableCell>
                          {row.building.no}
                          {row.wholeCompany && (
                            <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">
                              整栋 · {row.wholeCompany.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.companyCount} 家</TableCell>
                        <TableCell className="text-right tabular-nums">¥{row.receivable.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">¥{row.received.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-medium tabular-nums ${rateTextClass(row.rate)}`}>
                          {formatPercent(row.rate)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/20 font-medium">
                      <TableCell className="text-xs">{group.zoneName}小计</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {group.rows.reduce((s, r) => s + r.companyCount, 0)} 家
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">¥{group.subtotal.receivable.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">¥{group.subtotal.received.toLocaleString()}</TableCell>
                      <TableCell className={`text-right tabular-nums text-xs ${rateTextClass(group.subtotal.rate)}`}>
                        {formatPercent(group.subtotal.rate)}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
                <TableRow className="border-t-2 bg-muted/40 font-semibold">
                  <TableCell>合计</TableCell>
                  <TableCell className="text-right tabular-nums">{scoped.companies.length} 家</TableCell>
                  <TableCell className="text-right tabular-nums">¥{buildingTable.total.receivable.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">¥{buildingTable.total.received.toLocaleString()}</TableCell>
                  <TableCell className={`text-right tabular-nums ${rateTextClass(buildingTable.total.rate)}`}>
                    {formatPercent(buildingTable.total.rate)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <Card className="py-0">
            <CardHeader className="border-b py-3!">
              <CardTitle className="text-sm font-medium">客服个人收缴率(本月,按服务区域)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>客服</TableHead>
                    <TableHead className="text-right">名下企业</TableHead>
                    <TableHead className="text-right">应收</TableHead>
                    <TableHead className="text-right">实收</TableHead>
                    <TableHead className="text-right">收缴率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csTable.rows.map((row) => (
                    <TableRow key={row.csUsername}>
                      <TableCell className="font-medium">{row.csName}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.companyCount} 家</TableCell>
                      <TableCell className="text-right tabular-nums">¥{row.receivable.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">¥{row.received.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium tabular-nums ${rateTextClass(row.rate)}`}>
                        {formatPercent(row.rate)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/40 font-semibold">
                    <TableCell>合计</TableCell>
                    <TableCell className="text-right tabular-nums">{csTable.rows.reduce((s, r) => s + r.companyCount, 0)} 家</TableCell>
                    <TableCell className="text-right tabular-nums">¥{csTable.total.receivable.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">¥{csTable.total.received.toLocaleString()}</TableCell>
                    <TableCell className={`text-right tabular-nums ${rateTextClass(csTable.total.rate)}`}>
                      {formatPercent(csTable.total.rate)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ===== 收款跟进(原催缴弱化):最需关注的前几家 ===== */}
          <Card className="py-0">
            <CardHeader className="flex flex-row items-center justify-between border-b py-3!">
              <CardTitle className="text-sm font-medium">收款跟进 · 前置判断</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
                <Link to="/property/companies?tab=followup">完整列表 →</Link>
              </Button>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {followUpTop.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">当前没有未缴清企业,收款情况健康。</p>
              )}
              {followUpTop.map((row) => (
                <div key={row.company.id} className="space-y-1.5 p-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/property/companies/${row.company.id}`} className="text-sm font-medium hover:underline">
                      {row.company.name}
                    </Link>
                    <StatusBadge meta={followUpSuggestionMap[row.suggestion]} />
                    <span className="ml-auto text-sm font-medium tabular-nums text-red-600">
                      ¥{row.arrears.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {row.reasons.map((reason) => (
                      <div key={reason.key} className="flex items-start gap-1.5 text-xs">
                        {reason.hit ? (
                          <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                        ) : (
                          <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                        )}
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{reason.label}:</span>
                          {reason.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  {row.waivers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      历史减免:
                      {row.waivers.map((w) => `${w.month} ¥${w.amount.toLocaleString()}(${w.reason.slice(0, 12)}…)`).join('、')}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AiSummaryCard summary={aiSummary} />
    </div>
  )
}
