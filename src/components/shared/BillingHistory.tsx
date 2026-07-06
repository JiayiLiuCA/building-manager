import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { billOutstanding, getBillStatus, getCompanyMonthlyBills, type MonthlyBills } from '@/data/selectors/billingSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import type { Bill, FeeCategory } from '@/data/types'
import { moneyLabelFormatter } from '@/lib/charts'
import { CURRENT_MONTH } from '@/lib/date'
import { formatCurrency, formatDateTime, formatMonth } from '@/lib/format'
import { billStatusMap, billSubTypeMap, feeCategoryMap } from '@/lib/statusMaps'
import { cn } from '@/lib/utils'

/** 四费类 → 图表配色 */
const FEE_CHART_COLOR: Record<FeeCategory, string> = {
  property: 'var(--chart-1)',
  utility: 'var(--chart-2)',
  vehicle: 'var(--chart-3)',
  valueAdded: 'var(--chart-5)',
}

const CATEGORIES: FeeCategory[] = ['property', 'utility', 'vehicle', 'valueAdded']

/** 单笔账单的展示名:费类 + 细分口径 */
function billLineLabel(bill: Bill): string {
  const cat = feeCategoryMap[bill.category].label
  return bill.subType ? `${cat} · ${billSubTypeMap[bill.subType]}` : cat
}

/** 展开后每条费用的明细副标题:缴费时间 / 部分缴纳进度 / 未缴 */
function billDetail(bill: Bill): string {
  const outstanding = billOutstanding(bill)
  if (bill.paidAmount <= 0) return '尚未缴纳'
  if (outstanding > 0) return `已缴 ${formatCurrency(bill.paidAmount)} · 欠 ${formatCurrency(outstanding)}`
  return bill.paidAt ? `缴费时间 ${formatDateTime(bill.paidAt)}` : '已缴清'
}

/** 月度缴费状态徽章:当月未缴显示「本月待缴」(不报警),往月未缴才标红「欠费」 */
function monthStatusMeta(m: MonthlyBills) {
  if (m.status === 'none') return null
  if (m.outstanding === 0) return { label: '已结清', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (m.status === 'partial') return billStatusMap.partial
  if (m.month === CURRENT_MONTH) return { label: '本月待缴', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: '欠费', className: 'bg-red-50 text-red-700 border-red-200' }
}

interface Props {
  companyId: string
}

/**
 * 某企业近 12 个月缴费历史:四费类筛选 + 月度账单堆叠图(柱顶常显合计)+ 按月明细(可展开,含减免标注)。
 * 企业端「账单与缴费」与物业端「企业详情 · 账单」共用,保证两端口径一致。
 */
export function BillingHistory({ companyId }: Props) {
  const scoped = useScopedData()

  const [fee, setFee] = useState<'all' | FeeCategory>('all')
  const activeFee = fee === 'all' ? undefined : fee

  const monthlyAll = useMemo(() => getCompanyMonthlyBills(scoped, companyId, 12), [scoped, companyId])
  // 费类筛选:在 lines 层过滤后重算月度汇总
  const monthly = useMemo(() => {
    if (!activeFee) return monthlyAll
    return monthlyAll.map((m) => {
      const lines = m.lines.filter((b) => b.category === activeFee)
      const billed = lines.reduce((s, b) => s + b.amount, 0)
      const paid = lines.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
      return {
        ...m,
        lines,
        billed,
        paid,
        outstanding: billed - paid,
        status: (lines.length === 0 ? 'none' : paid >= billed ? 'paid' : paid > 0 ? 'partial' : 'unpaid') as MonthlyBills['status'],
      }
    })
  }, [monthlyAll, activeFee])

  const waivers = useMemo(() => scoped.waivers.filter((w) => w.companyId === companyId), [scoped.waivers, companyId])

  const paidTotal = monthly.reduce((s, m) => s + m.paid, 0)
  const billedTotal = monthly.reduce((s, m) => s + m.billed, 0)
  const unpaidTotal = Math.max(0, billedTotal - paidTotal)

  // 图表数据:升序(旧 → 新),每行 { month, [category]: 应缴金额, total }
  const chartData = useMemo(
    () =>
      [...monthly].reverse().map((m) => {
        const row: Record<string, number | string> = { month: m.month, total: m.billed }
        for (const line of m.lines) {
          const key = line.category
          row[key] = (Number(row[key]) || 0) + line.amount
        }
        return row
      }),
    [monthly],
  )
  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {}
    for (const cat of CATEGORIES) cfg[cat] = { label: feeCategoryMap[cat].label, color: FEE_CHART_COLOR[cat] }
    return cfg
  }, [])
  const series = fee === 'all' ? CATEGORIES : [fee]

  return (
    <Card className="py-0">
      <CardHeader className="gap-3 border-b py-3!">
        <CardTitle className="text-sm font-medium">账单记录 · 近 12 个月</CardTitle>
        {/* 费类筛选 */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFee(cat)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                fee === cat
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {cat === 'all' ? '全部' : feeCategoryMap[cat].label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* 汇总 */}
        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">
              近 12 个月{fee === 'all' ? '' : feeCategoryMap[fee].label}已缴
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">{formatCurrency(paidTotal)}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>
              应缴 <span className="font-medium text-foreground tabular-nums">{formatCurrency(billedTotal)}</span>
            </p>
            {unpaidTotal > 0 && (
              <p className="mt-0.5 font-medium text-red-600 tabular-nums">未缴 {formatCurrency(unpaidTotal)}</p>
            )}
          </div>
        </div>

        {/* 月度账单趋势(应缴,按费类堆叠,柱顶常显合计) */}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">月度账单构成 · 应缴(元)</p>
          <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
            <BarChart data={chartData} margin={{ left: -8, right: 8, top: 18 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                fontSize={11}
                tickFormatter={(m: string) => `${Number(m.slice(5))}月`}
              />
              <YAxis tickLine={false} axisLine={false} width={52} fontSize={11} tickFormatter={(v: number) => moneyLabelFormatter(v)} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => formatMonth(String(payload?.[0]?.payload?.month ?? ''))}
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-[2px]" style={{ background: `var(--color-${name})` }} />
                          {chartConfig[name as string]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              {series.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="fee"
                  fill={`var(--color-${cat})`}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={28}
                >
                  {i === series.length - 1 && (
                    <LabelList dataKey="total" position="top" formatter={moneyLabelFormatter} className="fill-foreground" fontSize={9} />
                  )}
                </Bar>
              ))}
              {fee === 'all' && <ChartLegend content={<ChartLegendContent />} />}
            </BarChart>
          </ChartContainer>
        </div>

        {/* 按月明细:每月可展开查看费类拆分、缴费时间与减免 */}
        {monthly.every((m) => m.status === 'none') ? (
          <EmptyState title="暂无账单记录" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="divide-y">
              {monthly.map((m) => {
                const meta = monthStatusMeta(m)
                const monthWaivers = waivers.filter((w) => w.month === m.month)
                return (
                  <Collapsible key={m.month}>
                    <CollapsibleTrigger
                      disabled={m.status === 'none'}
                      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-default disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatMonth(m.month)}</span>
                          {meta && <StatusBadge meta={meta} />}
                          {monthWaivers.length > 0 && (
                            <Badge variant="outline" className="border-sky-200 bg-sky-50 px-1.5 py-0 font-normal text-sky-700">
                              含减免
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.lines.length > 0 ? `${m.lines.length} 笔账单` : '本月无该费类账单'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular-nums">{formatCurrency(m.billed)}</p>
                        {m.outstanding > 0 ? (
                          <p className="text-xs font-medium text-red-600 tabular-nums">欠 {formatCurrency(m.outstanding)}</p>
                        ) : (
                          m.status !== 'none' && <p className="text-xs text-emerald-600">已结清</p>
                        )}
                      </div>
                      {m.status !== 'none' && (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      )}
                    </CollapsibleTrigger>
                    {m.status !== 'none' && (
                      <CollapsibleContent>
                        <ul className="divide-y border-t bg-muted/20">
                          {m.lines.map((bill) => (
                            <li key={bill.id} className="flex items-center justify-between gap-3 px-4 py-2">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn('px-1.5 py-0 font-normal', feeCategoryMap[bill.category].className)}
                                  >
                                    {billLineLabel(bill)}
                                  </Badge>
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums">{billDetail(bill)}</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-sm font-medium tabular-nums">{formatCurrency(bill.amount)}</span>
                                <StatusBadge meta={billStatusMap[getBillStatus(bill)]} />
                              </div>
                            </li>
                          ))}
                          {monthWaivers.map((w) => (
                            <li key={w.id} className="flex items-center justify-between gap-3 bg-sky-50/50 px-4 py-2">
                              <span className="text-xs text-sky-700">
                                本月减免 {formatCurrency(w.amount)}({w.reason})
                              </span>
                              <span className="text-xs text-sky-700">已在应缴中扣减</span>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
