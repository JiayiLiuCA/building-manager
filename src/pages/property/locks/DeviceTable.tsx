import { Battery, DoorOpen, LockKeyhole, Search, ShieldAlert, Wifi } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { BatteryText, SignalText } from '@/components/locks/lockUi'
import { CompanyCell } from '@/components/shared/CompanyCell'
import { EmptyState } from '@/components/shared/EmptyState'
import { KpiCard } from '@/components/shared/KpiCard'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getActiveAssignment, getLockKpis, isLowBattery, lockLocationLabel, remoteUnlockBlockReason } from '@/data/selectors/lockSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { DoorLock, LockKind } from '@/data/types'
import { lockAssignedMap, lockKindMap, lockOnlineMap } from '@/lib/statusMaps'

const PAGE_SIZE = 10

/** 设备总览:KPI 行 + 筛选 + 设备表(远程开锁 / 详情) */
export function DeviceTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const remoteUnlock = useAppStore((s) => s.remoteUnlock)

  const q = searchParams.get('q') ?? ''
  const zone = searchParams.get('zone') ?? 'all'
  const kind = searchParams.get('kind') ?? 'all'
  const status = searchParams.get('lockStatus') ?? 'all'
  const [page, setPage] = useState(1)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === 'all' || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  const openDetail = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', id)
    setSearchParams(next, { replace: true })
  }

  const kpis = useMemo(() => getLockKpis(scoped), [scoped])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return scoped.doorLocks
      .filter((lock) => {
        if (zone !== 'all' && lock.zoneId !== zone) return false
        if (kind !== 'all' && lock.kind !== kind) return false
        if (status === 'online' && !lock.isOnline) return false
        if (status === 'offline' && lock.isOnline) return false
        if (status === 'low' && !isLowBattery(lock)) return false
        if (kw) {
          const company = getActiveAssignment(scoped, lock.id)
          const companyName = company
            ? (scoped.companies.find((c) => c.id === company.companyId)?.name ?? company.companyNameSnapshot)
            : ''
          if (
            !lock.name.toLowerCase().includes(kw) &&
            !lock.sn.toLowerCase().includes(kw) &&
            !companyName.toLowerCase().includes(kw)
          )
            return false
        }
        return true
      })
      .sort((a, b) => a.id.localeCompare(b.id))
  }, [scoped, q, zone, kind, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const doUnlock = (lock: DoorLock) => {
    const blocked = remoteUnlockBlockReason(lock)
    if (blocked) {
      toast.error(`${lock.name}:${blocked}`)
      return
    }
    if (remoteUnlock(lock.id)) {
      toast.success(`已发送开锁指令,${lock.name} 已开门(通行记录已生成)`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard title="设备总数" value={String(kpis.total)} icon={LockKeyhole} sub="WiFi 直连,无需网关" />
        <KpiCard
          title="在线设备"
          value={String(kpis.online)}
          icon={Wifi}
          sub={`在线率 ${kpis.total ? Math.round((kpis.online / kpis.total) * 100) : 0}%`}
          alert={kpis.online < kpis.total}
          alertText={kpis.online < kpis.total ? `${kpis.total - kpis.online} 台离线待排查` : undefined}
        />
        <KpiCard
          title="低电量(≤20%)"
          value={String(kpis.lowBattery)}
          icon={Battery}
          alert={kpis.lowBattery > 0}
          alertText={kpis.lowBattery > 0 ? '建议生成换电池工单' : undefined}
        />
        <KpiCard title="今日开锁" value={String(kpis.todayUnlocks)} icon={DoorOpen} sub="成功通行次数" />
        <KpiCard
          title="近 7 天异常"
          value={String(kpis.weekFailures)}
          icon={ShieldAlert}
          sub="开锁失败次数"
          alert={kpis.weekFailures > 10}
        />
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索锁名 / SN / 企业"
                className="h-8 w-56 pl-8"
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
              />
            </div>
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
            <Select value={kind} onValueChange={(v) => setParam('kind', v)}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {(Object.keys(lockKindMap) as LockKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {lockKindMap[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setParam('lockStatus', v)}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="online">在线</SelectItem>
                <SelectItem value="offline">离线</SelectItem>
                <SelectItem value="low">低电量</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title="没有符合条件的门锁" description="试试调整筛选条件" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">门锁</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>当前分配</TableHead>
                  <TableHead>在线</TableHead>
                  <TableHead>电量</TableHead>
                  <TableHead>信号</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((lock) => {
                  const assignment = getActiveAssignment(scoped, lock.id)
                  const blocked = remoteUnlockBlockReason(lock)
                  return (
                    <TableRow key={lock.id} className="cursor-pointer" onClick={() => openDetail(lock.id)}>
                      <TableCell className="pl-4">
                        <p className="text-sm font-medium leading-tight">{lock.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {lockLocationLabel(lock)} · {lock.sn}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge meta={lockKindMap[lock.kind]} />
                      </TableCell>
                      <TableCell>
                        {lock.kind !== 'unit' ? (
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            公共
                          </Badge>
                        ) : assignment ? (
                          <CompanyCell companyId={assignment.companyId} />
                        ) : (
                          <StatusBadge meta={lockAssignedMap.vacant} />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge meta={lockOnlineMap[lock.isOnline ? 'online' : 'offline']} />
                        {lock.powerSavingMode && (
                          <p className="mt-0.5 text-xs text-amber-600">省电模式</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <BatteryText battery={lock.battery} />
                      </TableCell>
                      <TableCell>
                        <SignalText lock={lock} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 pr-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            disabled={!!blocked}
                            title={blocked ?? '通过 WiFi 远程开锁'}
                            onClick={() => doUnlock(lock)}
                          >
                            <DoorOpen /> 远程开锁
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => openDetail(lock.id)}>
                            详情
                          </Button>
                        </div>
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
    </div>
  )
}
