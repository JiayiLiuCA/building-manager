import {
  BellRing,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Megaphone,
  ShieldCheck,
  Smile,
  Wrench,
} from 'lucide-react'
import { useMemo } from 'react'
import { AiSummaryCard } from '@/components/shared/AiSummaryCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildDailyAiSummary } from '@/data/mock-content/aiSummaries'
import { buildDailyReport, type DailyFeedEntry } from '@/data/selectors/dailyReportSelectors'
import { useScopedData, useScopedInternal } from '@/hooks/useScopedData'
import { formatPercent } from '@/lib/format'

const CHANNEL_META: Record<DailyFeedEntry['channel'], { label: string; className: string }> = {
  payment: { label: '收款', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  workOrder: { label: '工单', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  complaint: { label: '投诉', className: 'bg-red-50 text-red-700 border-red-200' },
  maintenance: { label: '维保', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  inspection: { label: '巡检', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  notice: { label: '通知', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  survey: { label: '调研', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  followUp: { label: '跟进', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
}

interface BlockItem {
  icon: typeof CreditCard
  title: string
  lines: string[]
}

export function DailyReportPage() {
  const scoped = useScopedData()
  const internal = useScopedInternal()
  const report = useMemo(() => buildDailyReport(scoped, internal), [scoped, internal])
  const scopeLabel = scoped.currentUser?.role === 'supervisor' ? '全园区' : `名下 ${scoped.companies.length} 家企业`
  const aiSummary = useMemo(
    () => buildDailyAiSummary({ displayName: scoped.currentUser?.displayName ?? '', scopeLabel, report }),
    [scoped.currentUser?.displayName, scopeLabel, report],
  )

  const blocks: BlockItem[] = [
    {
      icon: CreditCard,
      title: '今日收款与收缴率',
      lines: [
        `今日到账 ${report.payments.count} 笔,合计 ¥${report.payments.amount.toLocaleString()}`,
        `本月收缴率 ${formatPercent(report.collection.rate)}(实收 ¥${report.collection.received.toLocaleString()} / 应收 ¥${report.collection.receivable.toLocaleString()})`,
      ],
    },
    {
      icon: Wrench,
      title: '工单与投诉',
      lines: [
        `新增工单 ${report.workOrders.created} 张 · 关闭 ${report.workOrders.closed} 张 · 在途 ${report.workOrders.open} 张`,
        `新增投诉 ${report.complaints.created} 条 · 关闭 ${report.complaints.closed} 条 · 未闭环 ${report.complaints.open} 条`,
      ],
    },
    {
      icon: ShieldCheck,
      title: '维保执行',
      lines: [
        `今日执行 ${report.maintenance.executedToday} 项`,
        report.maintenance.overdue > 0 ? `超期未执行 ${report.maintenance.overdue} 项,需督办` : '无超期未执行维保',
      ],
    },
    {
      icon: ClipboardCheck,
      title: '巡检完成',
      lines: [
        `已完成 ${report.inspections.doneToday} 次 · 待执行 ${report.inspections.pendingToday} 次`,
        report.inspections.abnormalItems > 0 ? `发现异常 ${report.inspections.abnormalItems} 项` : '未发现异常项',
      ],
    },
    {
      icon: Megaphone,
      title: '通知与满意度',
      lines: [
        `今日发布通知 ${report.notices.publishedToday} 条(生效中 ${report.notices.active} 条)`,
        `新增评价 ${report.ratings.count} 条${report.ratings.avg != null ? `(均分 ${report.ratings.avg.toFixed(1)})` : ''} · 调研新增 ${report.surveysSubmittedToday} 份`,
      ],
    },
    {
      icon: BellRing,
      title: '收款跟进动态',
      lines: [
        `今日发起 ${report.followUps.createdToday} 起 · 解决 ${report.followUps.resolvedToday} 起`,
        `当前跟进中 ${report.followUps.active} 起`,
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="日报"
        description={`${report.date} · ${scopeLabel} · 全部由当前角色可见数据实时生成,与驾驶舱口径一致`}
      />

      <AiSummaryCard summary={aiSummary} />

      {/* 付款日提示 */}
      {report.paydayHints.length > 0 && (
        <Card className="border-amber-200/70 bg-amber-50/50 py-0">
          <CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <CalendarClock className="size-4 text-amber-600" />
            <span className="font-medium text-amber-800">习惯付款日提示:</span>
            {report.paydayHints.map((hint) => (
              <span key={hint.company.id} className="text-amber-800">
                今天是 {hint.company.name} 的习惯付款日(每月 {hint.company.paymentHabit?.payDay} 日)
                {hint.paid ? ' —— 款项已如约到账 ✓' : ' —— 尚未到账,可留意'}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 分块数字 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {blocks.map((block) => (
          <Card key={block.title} className="py-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <block.icon className="size-4 text-muted-foreground/70" />
                <p className="text-sm font-medium">{block.title}</p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {block.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 今日系统动态(原始条目 → AI 提炼的来源层) */}
      <Card className="py-0">
        <CardHeader className="flex flex-row items-center gap-2 border-b py-3!">
          <Smile className="size-4 text-muted-foreground/70" />
          <CardTitle className="text-sm font-medium">今日系统动态(日报的原始来源条目)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.feed.length === 0 ? (
            <EmptyState title="今天还没有系统动态" description="缴费、工单流转、巡检、通知等动作会实时出现在这里" />
          ) : (
            <ul className="divide-y">
              {report.feed.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className="w-11 shrink-0 tabular-nums text-xs text-muted-foreground">{entry.time}</span>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${CHANNEL_META[entry.channel].className}`}>
                    {CHANNEL_META[entry.channel].label}
                  </Badge>
                  <span className="min-w-0">
                    <span className="text-muted-foreground">{entry.author} · </span>
                    {entry.content}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
