import { CalendarDays, ClipboardCheck, ListTodo, TriangleAlert, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { AiBadge } from '@/components/shared/AiBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DAILY_REPORTS, getDailyReport } from '@/data/mock-content/dailyReports'
import { useAppStore } from '@/data/store'
import type { DingTalkEntry } from '@/data/types'
import { DEMO_TODAY } from '@/lib/date'
import { cn } from '@/lib/utils'

const CHANNEL_META: Record<DingTalkEntry['channel'], { label: string; className: string }> = {
  group: { label: '钉钉群消息', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  report: { label: '工作汇报', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  log: { label: '工作日志', className: 'border-zinc-200 bg-zinc-100 text-zinc-600' },
}

const BLOCKS = [
  { key: 'today', title: '今日事项', icon: ClipboardCheck, accent: 'text-blue-600' },
  { key: 'tomorrow', title: '明日计划', icon: ListTodo, accent: 'text-emerald-600' },
  { key: 'owners', title: '责任人', icon: UsersRound, accent: 'text-violet-600' },
  { key: 'risks', title: '风险点', icon: TriangleAlert, accent: 'text-red-600' },
] as const

export function DailyReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? DEMO_TODAY
  const report = getDailyReport(date)

  // 运行时动作联动:今天新上报的催缴户,动态追加到当日风险点
  const dunningRecords = useAppStore((s) => s.dunningRecords)
  const households = useAppStore((s) => s.households)
  const extraRisks = useMemo(() => {
    return dunningRecords
      .filter((r) => r.isReported && r.reportedAt?.startsWith(date) && r.reportedAt.slice(0, 10) === DEMO_TODAY)
      .map((r) => {
        const h = households.find((x) => x.id === r.householdId)
        return h ? `${h.householdNo} ${h.ownerName} 长期欠费催缴无果,今日已标记上报(实时)` : ''
      })
      .filter(Boolean)
  }, [dunningRecords, households, date])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="日报" description="每日自动抓取钉钉群消息 / 工作汇报 / 日志,经大模型汇总提炼">
        <Select
          value={date}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.set('date', v)
            setSearchParams(next, { replace: true })
          }}
        >
          <SelectTrigger size="sm" className="w-40 bg-background">
            <CalendarDays className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAILY_REPORTS.map((r) => (
              <SelectItem key={r.date} value={r.date}>
                {r.date}
                {r.date === DEMO_TODAY && ' (今天)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {!report ? (
        <EmptyState title="该日期暂无日报" description="演示数据覆盖 2026-05-31 ~ 2026-06-06" />
      ) : (
        <>
          {/* AI 汇总四块 */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">当日 AI 汇总</p>
            <AiBadge />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {BLOCKS.map((block) => {
              const items: string[] =
                block.key === 'risks' ? [...report.summary.risks, ...extraRisks] : [...report.summary[block.key]]
              return (
                <Card key={block.key} className="py-0">
                  <CardHeader className="border-b py-3!">
                    <CardTitle className={cn('flex items-center gap-2 text-sm font-medium', block.accent)}>
                      <block.icon className="size-4" />
                      {block.title}
                      <span className="font-normal text-muted-foreground">({items.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-relaxed">
                          <span className={cn('mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-60', block.accent)} />
                          <span className={item.endsWith('(实时)') ? 'font-medium text-red-600' : undefined}>
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* 原始来源条目 */}
          <Card className="mt-5 py-0">
            <CardHeader className="flex flex-row items-center justify-between border-b py-3!">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                原始来源条目
                <span className="font-normal text-muted-foreground">
                  ({report.sourceEntries.length} 条,模拟从钉钉抓取)
                </span>
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                AI 从以下原始信息提炼出上方摘要
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {report.sourceEntries.map((entry) => (
                  <li key={entry.id} className="flex gap-3 px-4 py-3">
                    <span className="w-12 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
                      {entry.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{entry.author}</span>
                        <Badge variant="outline" className={cn('px-1.5 py-0 text-xs font-normal', CHANNEL_META[entry.channel].className)}>
                          {CHANNEL_META[entry.channel].label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
