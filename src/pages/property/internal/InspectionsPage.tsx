import { CalendarClock, CircleAlert, CircleCheck, CircleX, ClipboardCheck, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { INSPECTION_TEMPLATES } from '@/data/seed/constants'
import {
  deriveInspectionStatus,
  getInspectionStats,
  getRecentInspections,
  getTemplateDist,
} from '@/data/selectors/inspectionSelectors'
import { useScopedInternal } from '@/hooks/useScopedData'
import { daysAgo } from '@/lib/date'
import { formatDateTime, formatPercent } from '@/lib/format'
import { inspectionStatusMap, inspectionTemplateMap } from '@/lib/statusMaps'
import type { Inspection } from '@/data/types'

const PAGE_SIZE = 10

export function InspectionsPage() {
  const internal = useScopedInternal()
  const inspections = internal.inspections

  const recent30 = useMemo(() => inspections.filter((i) => i.plannedAt >= daysAgo(30, '00:00')), [inspections])
  const stats = useMemo(() => getInspectionStats(recent30), [recent30])
  const overdueCount = useMemo(
    () => recent30.filter((i) => deriveInspectionStatus(i) === 'overdue').length,
    [recent30],
  )
  const recent60 = useMemo(() => getRecentInspections(inspections, daysAgo(60, '00:00')), [inspections])
  const templateDist = useMemo(() => getTemplateDist(recent60), [recent60])

  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(recent60.length / PAGE_SIZE))
  const pageRows = recent60.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const [selected, setSelected] = useState<Inspection | null>(null)

  const abnormalSummary = (inspection: Inspection): string => {
    const notes = inspection.items.filter((x) => !x.ok).map((x) => x.note ?? '异常')
    return notes.length > 0 ? notes.join(';') : '—'
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="日常巡检"
        description="制式巡检表单 · 主管见全部记录,客服仅见指派给自己的记录 · 巡检质量与时效性一目了然"
      />

      {/* ===== 近 30 天巡检质量 KPI ===== */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="巡检完成率(近 30 天)"
          value={formatPercent(stats.completionRate)}
          icon={ClipboardCheck}
          sub={`已执行 ${stats.executed} / 应执行 ${stats.due} 次`}
        />
        <KpiCard
          title="巡检及时率"
          value={formatPercent(stats.onTimeRate)}
          icon={Timer}
          sub="计划时间 2 小时内开检占比"
        />
        <KpiCard
          title="异常项数"
          value={`${stats.abnormalItemCount} 项`}
          icon={CircleAlert}
          alert={stats.abnormalItemCount > 0}
          alertText={stats.abnormalItemCount > 0 ? `涉及 ${stats.abnormalRecordCount} 次巡检` : undefined}
          sub="近 30 天 checklist 异常项"
        />
        <KpiCard
          title="超期未巡检"
          value={`${overdueCount} 次`}
          icon={CalendarClock}
          alert={overdueCount > 0}
          alertText={overdueCount > 0 ? '计划已过尚未执行' : undefined}
          sub="计划已过尚未执行"
        />
      </div>

      {/* ===== 巡检记录(制式表单)===== */}
      <Card className="py-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b py-3!">
          <CardTitle className="text-sm font-medium">巡检记录(近 60 天,共 {recent60.length} 条)</CardTitle>
          <p className="text-xs text-muted-foreground">
            {templateDist.map((d) => `${inspectionTemplateMap[d.templateKey].label} ${d.count}`).join(' · ')}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {pageRows.length === 0 ? (
            <EmptyState title="暂无巡检记录" description="当前账号名下没有巡检记录" />
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>计划时间</TableHead>
                  <TableHead>巡检区域</TableHead>
                  <TableHead>巡检类型</TableHead>
                  <TableHead>巡检人</TableHead>
                  <TableHead className="text-right">照片</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="max-w-56">异常摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((inspection) => {
                  const status = deriveInspectionStatus(inspection)
                  return (
                    <TableRow
                      key={inspection.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(inspection)}
                    >
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateTime(inspection.plannedAt)}
                      </TableCell>
                      <TableCell>{inspection.areaLabel}</TableCell>
                      <TableCell>
                        <StatusBadge meta={inspectionTemplateMap[inspection.templateKey]} />
                      </TableCell>
                      <TableCell>{inspection.inspectorName}</TableCell>
                      <TableCell className="text-right tabular-nums">{inspection.photoCount} 张</TableCell>
                      <TableCell>
                        <StatusBadge meta={inspectionStatusMap[status]} />
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                        {abnormalSummary(inspection)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <div className="border-t px-4 py-2">
            <SimplePagination page={page} pageCount={pageCount} total={recent60.length} onChange={setPage} />
          </div>
        </CardContent>
      </Card>

      {/* ===== 单条巡检 checklist 明细(制式表单)===== */}
      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {selected.areaLabel}
                  <StatusBadge meta={inspectionTemplateMap[selected.templateKey]} />
                  <StatusBadge meta={inspectionStatusMap[deriveInspectionStatus(selected)]} />
                </DialogTitle>
                <DialogDescription className="text-xs">
                  计划 {formatDateTime(selected.plannedAt)} · 实际{' '}
                  {selected.executedAt ? formatDateTime(selected.executedAt) : '未执行'} · 巡检人{' '}
                  {selected.inspectorName} · 照片 {selected.photoCount} 张(占位)
                </DialogDescription>
              </DialogHeader>
              <ul className="divide-y rounded-lg border">
                {INSPECTION_TEMPLATES[selected.templateKey].items.map((item) => {
                  const result = selected.items.find((x) => x.itemKey === item.key)
                  const ok = result?.ok ?? true
                  return (
                    <li key={item.key} className="flex items-start gap-2 px-3 py-2 text-sm">
                      {ok ? (
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <CircleX className="mt-0.5 size-4 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0">
                        <p>{item.label}</p>
                        {!ok && result?.note && <p className="mt-0.5 text-xs text-red-600">{result.note}</p>}
                      </div>
                      <span className={`ml-auto shrink-0 text-xs ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
                        {ok ? '合格' : '异常'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
