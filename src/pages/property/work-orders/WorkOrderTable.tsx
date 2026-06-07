import { AlarmClock, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { HouseholdCell } from '@/components/shared/HouseholdCell'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deriveWorkOrderStatus, isWorkOrderOverdue, reportedAt } from '@/data/selectors/workOrderSelectors'
import { useAppStore } from '@/data/store'
import type { WorkOrderStatus } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { workOrderCategoryMap, workOrderStatusMap } from '@/lib/statusMaps'

const PAGE_SIZE = 10

export function WorkOrderTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useAppStore()
  const status = searchParams.get('status') ?? 'all'
  const community = searchParams.get('community') ?? 'all'
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

  const householdMap = useMemo(() => new Map(state.households.map((h) => [h.id, h])), [state.households])
  const staffMap = useMemo(() => new Map(state.staff.map((s) => [s.id, s])), [state.staff])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return state.workOrders
      .filter((wo) => {
        const h = householdMap.get(wo.householdId)
        if (status !== 'all' && deriveWorkOrderStatus(wo) !== status) return false
        if (overdueOnly && !isWorkOrderOverdue(wo)) return false
        if (community !== 'all' && h?.communityId !== community) return false
        if (kw && !(wo.id.toLowerCase().includes(kw) || h?.householdNo.includes(q.trim()) || h?.ownerName.includes(q.trim())))
          return false
        return true
      })
      .sort((a, b) => reportedAt(b).localeCompare(reportedAt(a)))
  }, [state.workOrders, householdMap, status, community, overdueOnly, q])

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
                placeholder="搜索工单号 / 户号 / 业主"
                className="h-8 w-60 pl-8"
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
              />
            </div>
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
            <Select value={community} onValueChange={(v) => setParam('community', v)}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部小区</SelectItem>
                {state.communities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
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
                  <TableHead>户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>报修时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>维修人员</TableHead>
                  <TableHead>预约时间</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((wo) => (
                  <TableRow key={wo.id} className="cursor-pointer" onClick={() => openDetail(wo.id)}>
                    <TableCell className="pl-4 font-mono text-xs">{wo.id}</TableCell>
                    <TableCell>
                      <HouseholdCell householdId={wo.householdId} />
                    </TableCell>
                    <TableCell>{workOrderCategoryMap[wo.category]}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDateTime(reportedAt(wo))}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge meta={workOrderStatusMap[deriveWorkOrderStatus(wo)]} />
                        <OverdueBadge workOrder={wo} />
                      </div>
                    </TableCell>
                    <TableCell>{wo.assignedStaffId ? staffMap.get(wo.assignedStaffId)?.name : '—'}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDateTime(wo.appointmentAt)}
                    </TableCell>
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
