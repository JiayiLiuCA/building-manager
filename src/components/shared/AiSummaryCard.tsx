import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardAiSummary } from '@/data/types'
import { AiBadge } from './AiBadge'

export function AiSummaryCard({ summary }: { summary: DashboardAiSummary }) {
  return (
    <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50/70 via-background to-blue-50/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-violet-500" />
          {summary.headline}
        </CardTitle>
        <AiBadge />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
          {summary.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {summary.sections.map((s) => (
            <div key={s.label} className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-semibold text-violet-600">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70">* 内容由大模型基于今日经营数据自动生成,仅供决策参考</p>
      </CardContent>
    </Card>
  )
}
