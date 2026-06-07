import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { HouseholdCell } from '@/components/shared/HouseholdCell'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { complaintCreatedAt, deriveComplaintStatus } from '@/data/selectors/complaintSelectors'
import { useAppStore } from '@/data/store'
import type { ComplaintStatus } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { complaintStatusMap, deptMap } from '@/lib/statusMaps'

const PAGE_SIZE = 10

export function ComplaintTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useAppStore()
  const status = searchParams.get('status') ?? 'all'
  const community = searchParams.get('community') ?? 'all'
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

  const filtered = useMemo(() => {
    const kw = q.trim()
    return state.complaints
      .filter((c) => {
        const h = householdMap.get(c.householdId)
        if (status !== 'all' && deriveComplaintStatus(c) !== status) return false
        if (community !== 'all' && h?.communityId !== community) return false
        if (
          kw &&
          !(
            c.id.toLowerCase().includes(kw.toLowerCase()) ||
            c.content.includes(kw) ||
            h?.householdNo.includes(kw) ||
            h?.ownerName.includes(kw)
          )
        )
          return false
        return true
      })
      .sort((a, b) => complaintCreatedAt(b).localeCompare(complaintCreatedAt(a)))
  }, [state.complaints, householdMap, status, community, q])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <Card className="py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索投诉号 / 户号 / 业主 / 内容"
                className="h-8 w-64 pl-8"
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
                {(Object.keys(complaintStatusMap) as ComplaintStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {complaintStatusMap[s].label}
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
          </div>

          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="没有符合条件的投诉" description="试试调整筛选条件" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">投诉号</TableHead>
                  <TableHead>户</TableHead>
                  <TableHead>关联工单</TableHead>
                  <TableHead className="max-w-64">投诉内容</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>责任部门</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c.id)}>
                    <TableCell className="pl-4 font-mono text-xs">{c.id}</TableCell>
                    <TableCell>
                      <HouseholdCell householdId={c.householdId} />
                    </TableCell>
                    <TableCell>
                      {c.workOrderId ? (
                        <button
                          type="button"
                          className="font-mono text-xs text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(c.workOrderId!)
                          }}
                        >
                          {c.workOrderId}
                        </button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">{c.content}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDateTime(complaintCreatedAt(c))}
                    </TableCell>
                    <TableCell>{c.responsibleDept ? deptMap[c.responsibleDept] : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge meta={complaintStatusMap[deriveComplaintStatus(c)]} />
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
