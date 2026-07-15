import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useScopedData } from '@/hooks/useScopedData'
import type { UnlockMethod } from '@/data/types'
import { dateDaysAgo } from '@/lib/date'
import { formatDateTime } from '@/lib/format'
import { unlockMethodMap } from '@/lib/statusMaps'

const PAGE_SIZE = 15

/** 通行记录:筛选(方式/结果/时间范围/关键字)+ 失败行高亮;模拟 TTLock 回调推送的准实时记录 */
export function RecordTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()

  const q = searchParams.get('rq') ?? ''
  const method = searchParams.get('method') ?? 'all'
  const result = searchParams.get('result') ?? 'all'
  const range = searchParams.get('range') ?? '7'
  const [page, setPage] = useState(1)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === 'all' || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  const lockById = useMemo(() => new Map(scoped.doorLocks.map((l) => [l.id, l])), [scoped.doorLocks])
  const companyNameById = useMemo(() => new Map(scoped.companies.map((c) => [c.id, c.name])), [scoped.companies])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const minDate = range === 'all' ? '' : dateDaysAgo(Number(range))
    return scoped.unlockRecords
      .filter((r) => {
        if (minDate && r.at.slice(0, 10) < minDate) return false
        if (method !== 'all' && r.method !== method) return false
        if (result === 'ok' && !r.success) return false
        if (result === 'fail' && r.success) return false
        if (kw) {
          const lock = lockById.get(r.lockId)
          const companyName = r.companyId ? (companyNameById.get(r.companyId) ?? '') : ''
          if (
            !(lock?.name.toLowerCase().includes(kw) ?? false) &&
            !r.actorLabel.toLowerCase().includes(kw) &&
            !companyName.toLowerCase().includes(kw)
          )
            return false
        }
        return true
      })
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [scoped.unlockRecords, lockById, companyNameById, q, method, result, range])

  const failures = useMemo(() => filtered.filter((r) => !r.success).length, [filtered])
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
              placeholder="搜索锁名 / 操作者 / 企业"
              className="h-8 w-56 pl-8"
              value={q}
              onChange={(e) => setParam('rq', e.target.value)}
            />
          </div>
          <Select value={range} onValueChange={(v) => setParam('range', v)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">近 7 天</SelectItem>
              <SelectItem value="30">近 30 天</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
          <Select value={method} onValueChange={(v) => setParam('method', v)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部方式</SelectItem>
              {(Object.keys(unlockMethodMap) as UnlockMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {unlockMethodMap[m].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={result} onValueChange={(v) => setParam('result', v)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部结果</SelectItem>
              <SelectItem value="ok">成功</SelectItem>
              <SelectItem value="fail">失败</SelectItem>
            </SelectContent>
          </Select>
          <p className="ml-auto text-xs text-muted-foreground">
            共 {filtered.length} 条 · 失败 <span className={failures > 0 ? 'font-medium text-red-600' : ''}>{failures}</span> 条
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="暂无通行记录" description="试试放宽时间范围或调整筛选条件" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">时间</TableHead>
                <TableHead>门锁</TableHead>
                <TableHead>方式</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>归属企业</TableHead>
                <TableHead>结果</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const lock = lockById.get(r.lockId)
                return (
                  <TableRow key={r.id} className={r.success ? undefined : 'bg-red-50/60 hover:bg-red-50'}>
                    <TableCell className="pl-4 text-sm tabular-nums">{formatDateTime(r.at)}</TableCell>
                    <TableCell className="text-sm">{lock?.name ?? r.lockId}</TableCell>
                    <TableCell>
                      <StatusBadge meta={unlockMethodMap[r.method]} />
                    </TableCell>
                    <TableCell className="text-sm">{r.actorLabel}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.companyId ? (companyNameById.get(r.companyId) ?? '已迁出企业') : '—'}
                    </TableCell>
                    <TableCell>
                      {r.success ? (
                        <span className="text-sm text-emerald-600">成功</span>
                      ) : (
                        <span className="text-sm font-medium text-red-600">失败</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <SimplePagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={setPage} />
      </CardContent>
    </Card>
  )
}
