import { Droplets, Gauge, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/shared/ChartCard'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getMeterMonthRows, getUsageTrend, latestMeterMonth } from '@/data/selectors/meterSelectors'
import { useScopedInternal } from '@/hooks/useScopedData'
import { formatDateTime, formatMonth } from '@/lib/format'
import { monthTick } from '@/lib/charts'
import { utilitySubMap } from '@/lib/statusMaps'
import type { UtilitySub } from '@/data/types'

const usageConfig: Record<UtilitySub, ChartConfig> = {
  electricity: { usage: { label: '月用电量', color: 'var(--chart-3)' } },
  water: { usage: { label: '月用水量', color: 'var(--chart-2)' } },
}

const UNIT: Record<UtilitySub, string> = { electricity: 'kWh', water: '吨' }

const usageLabelFormatter = (value: unknown): string => {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : ''
}

/** 同环比显性文案:+5.2% / -1.8% / — */
function deltaText(v: number | null): string {
  if (v == null) return '—'
  return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function deltaClass(v: number | null): string {
  if (v == null) return 'text-muted-foreground'
  return v > 0 ? 'text-amber-600' : 'text-emerald-600'
}

export function MetersPage() {
  const internal = useScopedInternal()
  const readings = internal.meterReadings
  const [type, setType] = useState<UtilitySub>('electricity')

  const trend = useMemo(() => getUsageTrend(readings, type), [readings, type])
  const latestMonth = useMemo(() => latestMeterMonth(readings), [readings])
  const monthRows = useMemo(
    () => (latestMonth ? getMeterMonthRows(readings, latestMonth, type) : []),
    [readings, latestMonth, type],
  )

  const latest = trend[trend.length - 1]
  const unit = UNIT[type]

  return (
    <div className="space-y-4">
      <PageHeader
        title="能耗核抄"
        description={`水表 / 电表制式核抄表单 · 数据窗 24 个月 · 6 月核抄将于月末执行 · 主管见全部表计,客服仅见自己负责区域`}
      />

      <Tabs value={type} onValueChange={(v) => setType(v as UtilitySub)}>
        <TabsList>
          <TabsTrigger value="electricity">购电核抄</TabsTrigger>
          <TabsTrigger value="water">购水核抄</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ===== 最新月 KPI(含同比/环比)===== */}
      {latest && (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            title={`最新月用量(${formatMonth(latest.month)})`}
            value={`${latest.usage.toLocaleString('zh-CN')} ${unit}`}
            icon={type === 'electricity' ? Gauge : Droplets}
            sub={`覆盖 ${monthRows.length} 只表计`}
          />
          <KpiCard
            title="环比上月"
            value={deltaText(latest.mom)}
            icon={latest.mom != null && latest.mom > 0 ? TrendingUp : TrendingDown}
            sub="本月用量 / 上月用量 − 1"
          />
          <KpiCard
            title="同比去年同月"
            value={deltaText(latest.yoy)}
            icon={latest.yoy != null && latest.yoy > 0 ? TrendingUp : TrendingDown}
            sub="本月用量 / 去年同月 − 1"
          />
        </div>
      )}

      {/* ===== 月度用量趋势(显性数值 + 同环比明细)===== */}
      <ChartCard
        title={`${utilitySubMap[type]}月度用量趋势(近 12 个月)`}
        description={`单位 ${unit};柱上直接标用量,同比 / 环比见下表`}
        table={
          <div className="max-h-44 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月份</TableHead>
                  <TableHead className="text-right">用量({unit})</TableHead>
                  <TableHead className="text-right">环比</TableHead>
                  <TableHead className="text-right">同比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...trend].reverse().map((point) => (
                  <TableRow key={point.month}>
                    <TableCell>{point.month}</TableCell>
                    <TableCell className="text-right tabular-nums">{point.usage.toLocaleString('zh-CN')}</TableCell>
                    <TableCell className={`text-right tabular-nums ${deltaClass(point.mom)}`}>
                      {deltaText(point.mom)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${deltaClass(point.yoy)}`}>
                      {deltaText(point.yoy)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      >
        <ChartContainer config={usageConfig[type]} className="h-full w-full">
          <BarChart data={trend} margin={{ top: 22 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={monthTick} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              tickFormatter={(v: number) => v.toLocaleString('zh-CN')}
              tickLine={false}
              axisLine={false}
              fontSize={10}
              width={60}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="usage" fill="var(--color-usage)" radius={4}>
              <LabelList
                dataKey="usage"
                position="top"
                formatter={usageLabelFormatter}
                className="fill-foreground"
                fontSize={9}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      {/* ===== 最新月逐表核抄明细(制式表单)===== */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">
            {latestMonth ? formatMonth(latestMonth) : ''}逐表核抄明细({utilitySubMap[type]},{monthRows.length} 只表)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>表编号</TableHead>
                <TableHead>位置 / 归属</TableHead>
                <TableHead className="text-right">上期示数</TableHead>
                <TableHead className="text-right">本期示数</TableHead>
                <TableHead className="text-right">本期用量({unit})</TableHead>
                <TableHead className="text-right">上月用量</TableHead>
                <TableHead>核抄人</TableHead>
                <TableHead>核抄时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthRows.map(({ reading, usage, prevUsage }) => (
                <TableRow key={reading.id}>
                  <TableCell className="font-medium">{reading.meterNo}</TableCell>
                  <TableCell>{reading.location}</TableCell>
                  <TableCell className="text-right tabular-nums">{reading.prevValue.toLocaleString('zh-CN')}</TableCell>
                  <TableCell className="text-right tabular-nums">{reading.currValue.toLocaleString('zh-CN')}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{usage.toLocaleString('zh-CN')}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {prevUsage != null ? prevUsage.toLocaleString('zh-CN') : '—'}
                  </TableCell>
                  <TableCell>{reading.readerName}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(reading.readAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
