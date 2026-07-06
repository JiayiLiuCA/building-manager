import { AlarmClock, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CompanyCell } from '@/components/shared/CompanyCell'
import { EmptyState } from '@/components/shared/EmptyState'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deriveWorkOrderStatus, isWorkOrderOverdue, reportedAt } from '@/data/selectors/workOrderSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import type { WorkOrderKind, WorkOrderStatus } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { getWoStatusMeta, workOrderCategoryMap, workOrderKindMap, workOrderStatusMap } from '@/lib/statusMaps'

const PAGE_SIZE = 10

export function WorkOrderTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const status = searchParams.get('status') ?? 'all'
  const kind = searchParams.get('kind') ?? 'all'
  const zone = searchParams.get('zone') ?? 'all'
  const overdueOnly = searchParams.get('overdue') === '1'
  const q = searchParams.get('q') ?? ''
  const [page, setPage] = useState(1)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === 'all' || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  /** 原地打开详情 Modal(不重置分页、不跳路由) */
  const openDetail = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', id)
    setSearchParams(next, { replace: true })
  }

  const companyMap = useMemo(() => new Map(scoped.companies.map((c) => [c.id, c])), [scoped.companies])
  const staffMap = useMemo(() => new Map(scoped.staff.map((s) => [s.id, s])), [scoped.staff])

  const filtered = useMemo(() => {
    const kw = q.trim()
    return scoped.workOrders
      .filter((wo) => {
        const company = wo.companyId ? companyMap.get(wo.companyId) : undefined
        if (status !== 'all' && deriveWorkOrderStatus(wo) !== status) return false
        if (kind !== 'all' && wo.kind !== kind) return false
        if (overdueOnly && !isWorkOrderOverdue(wo)) return false
        if (zone !== 'all') {
          const woZone = wo.kind === 'company' ? company?.zoneId : wo.location?.zoneId
          if (woZone !== zone) return false
        }
        if (
          kw &&
          !(
            wo.id.toLowerCase().includes(kw.toLowerCase()) ||
            wo.description.includes(kw) ||
            company?.name.includes(kw) ||
            wo.location?.label.includes(kw)
          )
        )
          return false
        return true
      })
      .sort((a, b) => reportedAt(b).localeCompare(reportedAt(a)))
  }, [scoped.workOrders, companyMap, status, kind, zone, overdueOnly, q])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        {/* 筛选行 */}
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索工单号 / 企业 / 位置 / 描述"
              className="h-8 w-64 pl-8"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
          </div>
          <Select value={kind} onValueChange={(v) => setParam('kind', v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {(Object.keys(workOrderKindMap) as WorkOrderKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {workOrderKindMap[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setParam('status', v)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {(Object.keys(workOrderStatusMap) as WorkOrderStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {workOrderStatusMap[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zone} onValueChange={(v) => setParam('zone', v)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部区域</SelectItem>
              {scoped.zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={overdueOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setParam('overdue', overdueOnly ? null : '1')}
          >
            <AlarmClock /> 仅看超时
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="没有符合条件的工单" description="试试调整筛选条件" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">工单号</TableHead>
                <TableHead>报修方 / 位置</TableHead>
                <TableHead>工单类型</TableHead>
                <TableHead>维修类别</TableHead>
                <TableHead>报修时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>维修人员</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((wo) => (
                <TableRow key={wo.id} className="cursor-pointer" onClick={() => openDetail(wo.id)}>
                  <TableCell className="pl-4 font-mono text-xs">{wo.id}</TableCell>
                  <TableCell>
                    {wo.kind === 'company' ? (
                      <CompanyCell companyId={wo.companyId} />
                    ) : (
                      <span className="text-sm">{wo.location?.label}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={workOrderKindMap[wo.kind]} />
                  </TableCell>
                  <TableCell>{workOrderCategoryMap[wo.category]}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(reportedAt(wo))}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge meta={getWoStatusMeta(deriveWorkOrderStatus(wo), wo.kind)} />
                      <OverdueBadge workOrder={wo} />
                    </div>
                  </TableCell>
                  <TableCell>{wo.assignedStaffId ? staffMap.get(wo.assignedStaffId)?.name : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-primary">
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <SimplePagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={setPage} />
      </CardContent>
    </Card>
  )
}
