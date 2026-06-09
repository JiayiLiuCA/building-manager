import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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
import {
  getBillStatus,
  getHouseholdFeeTypes,
  getHouseholdMonthlyBills,
  type MonthFeeLine,
  type MonthlyBills,
} from '@/data/selectors/billingSelectors'
import { useAppStore } from '@/data/store'
import type { FeeType } from '@/data/types'
import { CURRENT_MONTH } from '@/lib/date'
import { formatCurrency, formatDateTime, formatMonth } from '@/lib/format'
import { billStatusMap, feeTypeMap } from '@/lib/statusMaps'
import { cn } from '@/lib/utils'

/** 费用类型 → 图表配色(沿用费用徽章的色相:物业=蓝 / 水=绿 / 电=黄 / 车位=紫) */
const FEE_CHART_COLOR: Record<FeeType, string> = {
  property: 'var(--chart-1)',
  water: 'var(--chart-2)',
  electricity: 'var(--chart-3)',
  parking: 'var(--chart-5)',
}

/** 展开后每条费用的明细副标题:缴费时间 / 部分缴纳进度 / 未缴 */
function billDetail(line: MonthFeeLine): string {
  const { bill, outstanding } = line
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
  householdId: string
}

/**
 * 某户近 12 个月缴费历史:费用类型筛选 + 月度账单堆叠图 + 按月明细(可展开)。
 * 业主端「我的缴费」与物业端「户档案 · 缴费记录」共用,保证两端口径一致。
 */
export function PaymentHistory({ householdId }: Props) {
  const state = useAppStore()
  const feeTypes = useMemo(() => getHouseholdFeeTypes(state, householdId), [state, householdId])

  // 费用类型筛选:'all' 或具体某项 —— 同时作用于趋势图与月度明细
  const [fee, setFee] = useState<'all' | FeeType>('all')
  // 跨户复用时若上一户选过的费用类型在本户不存在,回退到「全部」
  const shownFee = fee !== 'all' && !feeTypes.includes(fee) ? 'all' : fee
  const activeFee = shownFee === 'all' ? undefined : shownFee

  const monthly = useMemo(
    () => getHouseholdMonthlyBills(state, householdId, 12, activeFee),
    [state, householdId, activeFee],
  )
  const paidTotal = monthly.reduce((s, m) => s + m.paid, 0)
  const billedTotal = monthly.reduce((s, m) => s + m.billed, 0)
  const unpaidTotal = Math.max(0, billedTotal - paidTotal)

  // 图表数据:升序(旧 → 新),每行 { month, [feeType]: 应缴金额 }
  const chartData = useMemo(
    () =>
      [...monthly].reverse().map((m) => {
        const row: Record<string, number | string> = { month: m.month }
        for (const line of m.lines) row[line.feeType] = line.bill.amount
        return row
      }),
    [monthly],
  )
  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {}
    for (const ft of feeTypes) cfg[ft] = { label: feeTypeMap[ft].label, color: FEE_CHART_COLOR[ft] }
    return cfg
  }, [feeTypes])
  const series = shownFee === 'all' ? feeTypes : [shownFee]

  return (
    <Card className="py-0">
      <CardHeader className="gap-3 border-b py-3!">
        <CardTitle className="text-sm font-medium">缴费记录 · 近 12 个月</CardTitle>
        {/* 费用类型筛选 */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...feeTypes] as const).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFee(ft)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                shownFee === ft
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {ft === 'all' ? '全部' : feeTypeMap[ft].label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* 汇总 */}
        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">
              近 12 个月{shownFee === 'all' ? '' : feeTypeMap[shownFee].label}已缴
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

        {/* 月度账单趋势(应缴,按费用类型堆叠) */}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">月度账单构成 · 应缴(元)</p>
          <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
            <BarChart data={chartData} margin={{ left: -16, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={(m: string) => `${Number(m.slice(5))}月`}
              />
              <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `¥${v}`} />
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
              {series.map((ft, i) => (
                <Bar
                  key={ft}
                  dataKey={ft}
                  stackId="fee"
                  fill={`var(--color-${ft})`}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={28}
                />
              ))}
              {shownFee === 'all' && series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
            </BarChart>
          </ChartContainer>
        </div>

        {/* 按月明细:每月可展开查看费用拆分与缴费时间 */}
        {monthly.every((m) => m.status === 'none') ? (
          <EmptyState title="暂无缴费记录" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="divide-y">
              {monthly.map((m) => {
                const meta = monthStatusMeta(m)
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
                        </div>
                        {m.lines.length > 0 ? (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {m.lines.map((line) => (
                              <span key={line.feeType} className="inline-flex items-center gap-1 tabular-nums">
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ background: FEE_CHART_COLOR[line.feeType] }}
                                />
                                {feeTypeMap[line.feeType].label} {formatCurrency(line.bill.amount)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">本月无该费用账单</p>
                        )}
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
                          {m.lines.map((line) => (
                            <li key={line.feeType} className="flex items-center justify-between gap-3 px-4 py-2">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn('px-1.5 py-0 font-normal', feeTypeMap[line.feeType].className)}
                                  >
                                    {feeTypeMap[line.feeType].label}
                                  </Badge>
                                  {line.bill.isHalfPrice && <span className="text-xs text-muted-foreground">空置半价</span>}
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums">{billDetail(line)}</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-sm font-medium tabular-nums">{formatCurrency(line.bill.amount)}</span>
                                <StatusBadge meta={billStatusMap[getBillStatus(line.bill)]} />
                              </div>
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
