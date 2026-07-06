import { ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/shared/ChartCard'
import { CompanyCell } from '@/components/shared/CompanyCell'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SURVEY_QUESTIONS } from '@/data/seed/constants'
import {
  getCurrentSatisfaction,
  getLowScores,
  getMonthlySatisfaction,
  getSurveyStats,
} from '@/data/selectors/satisfactionSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import { formatDateTime } from '@/lib/format'
import { surveyStatusMap } from '@/lib/statusMaps'

const trendConfig = { overall: { label: '整体满意度', color: 'var(--chart-2)' } } satisfies ChartConfig

export function SatisfactionPage() {
  const scoped = useScopedData()
  const publishSurvey = useAppStore((s) => s.publishSurvey)
  const isSupervisorOrCs = scoped.currentUser?.role !== 'company'

  const monthly = useMemo(() => getMonthlySatisfaction(scoped, 12), [scoped])
  const current = useMemo(() => getCurrentSatisfaction(scoped), [scoped])
  const lowScores = useMemo(() => getLowScores(scoped).slice(0, 10), [scoped])
  const latest = monthly[monthly.length - 1]

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')

  const chartData = monthly.map((m) => ({ month: m.month, overall: m.overall == null ? null : Math.round(m.overall * 100) / 100 }))

  return (
    <div className="space-y-4">
      <PageHeader title="客户满意度" description="被动满意度(报修关单评价自动抓取)+ 满意度调研(线上制式问卷)双来源 · 月度整体数据">
        {isSupervisorOrCs && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> 发起调研
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="本月整体满意度" value={`${current.score.toFixed(1)} 分`} sub={`双来源加权(${current.month})`} />
        <KpiCard
          title="被动满意度(本月)"
          value={latest.passiveAvg != null ? `${latest.passiveAvg.toFixed(1)} 分` : '—'}
          sub={`报修关单评价 ${latest.passiveCount} 条`}
        />
        <KpiCard
          title="调研满意度(当期)"
          value={latest.surveyAvg != null ? `${latest.surveyAvg.toFixed(1)} 分` : '—'}
          sub={`本月新发问卷回收 ${latest.surveyCount} 份`}
        />
        <KpiCard
          title="低分评价"
          value={`${lowScores.length} 条`}
          alert={lowScores.length > 0}
          alertText="存在 ≤3 分评价,建议回访"
          sub="≤3 分的评价与问卷"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="近 12 月整体满意度趋势"
          description="双来源加权均分;来源拆分见下表"
          table={
            <div className="max-h-40 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">整体</TableHead>
                    <TableHead className="text-right">被动评价(条)</TableHead>
                    <TableHead className="text-right">调研(份)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...monthly].reverse().map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.month}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.overall != null ? m.overall.toFixed(2) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.passiveAvg != null ? `${m.passiveAvg.toFixed(1)}(${m.passiveCount})` : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.surveyAvg != null ? `${m.surveyAvg.toFixed(1)}(${m.surveyCount})` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        >
          <ChartContainer config={trendConfig} className="h-full w-full">
            <BarChart data={chartData} margin={{ top: 22 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(2).replace('-', '/')} tickLine={false} axisLine={false} fontSize={11} />
              <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={11} width={26} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="overall" fill="var(--color-overall)" radius={4}>
                <LabelList dataKey="overall" position="top" className="fill-foreground" fontSize={10} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <Card className="py-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b py-3!">
            <ClipboardList className="size-4 text-muted-foreground/70" />
            <CardTitle className="text-sm font-medium">满意度调研(制式问卷,企业端在线填写)</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {scoped.surveys
              .slice()
              .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
              .map((survey) => {
                const stats = getSurveyStats(scoped, survey.id)
                return (
                  <div key={survey.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{survey.title}</p>
                      <StatusBadge meta={surveyStatusMap[survey.status]} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {survey.publishedBy} 发起 · {formatDateTime(survey.publishedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      回收 <span className="font-medium text-foreground tabular-nums">{stats.responseCount}</span> 份
                      {stats.avg != null && (
                        <>
                          {' '}
                          · 综合均分 <span className="font-medium text-foreground tabular-nums">{stats.avg.toFixed(2)}</span> 分
                        </>
                      )}
                    </p>
                    {stats.responseCount > 0 && (
                      <div className="grid gap-1 sm:grid-cols-2">
                        {SURVEY_QUESTIONS.map((qDef) => (
                          <p key={qDef.key} className="flex justify-between gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{qDef.label}</span>
                            <span className="font-medium text-foreground tabular-nums">
                              {stats.perQuestion[qDef.key]?.toFixed(1) ?? '—'}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">低分评价明细(≤3 分,建议回访)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">时间</TableHead>
                <TableHead>企业</TableHead>
                <TableHead>来源</TableHead>
                <TableHead className="text-right">评分</TableHead>
                <TableHead className="max-w-72">内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowScores.map((item) => (
                <TableRow key={`${item.kind}-${item.refId}-${item.at}`}>
                  <TableCell className="pl-4 text-muted-foreground tabular-nums">{formatDateTime(item.at)}</TableCell>
                  <TableCell>
                    <CompanyCell companyId={item.companyId} />
                  </TableCell>
                  <TableCell className="text-sm">{item.kind === 'rating' ? '报修评价' : '满意度调研'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-amber-600">{item.score} 分</TableCell>
                  <TableCell className="max-w-72">
                    <p className="truncate text-sm text-muted-foreground">{item.text}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 发起调研(制式问卷题目统一) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>发起满意度调研</DialogTitle>
            <DialogDescription>使用园区制式问卷({SURVEY_QUESTIONS.length} 题,1~5 分),企业端在线填写。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">调研标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如:2026 年第三季度园区服务满意度调研" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">调研期号</Label>
              <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="如:2026 年第三季度" />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">制式问卷题目</p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {SURVEY_QUESTIONS.map((qDef, i) => (
                  <li key={qDef.key}>
                    {i + 1}. {qDef.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!title.trim() || !periodLabel.trim()}
              onClick={() => {
                publishSurvey({ title: title.trim(), periodLabel: periodLabel.trim() })
                setOpen(false)
                setTitle('')
                setPeriodLabel('')
                toast.success('调研已发起,企业端「满意度调研」页可在线填写')
              }}
            >
              发起调研
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
