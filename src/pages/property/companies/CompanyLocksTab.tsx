import { DoorOpen, PackageMinus, PackagePlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { BatteryText, SignalText } from '@/components/locks/lockUi'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  derivePasscodeStatus,
  getActiveAssignment,
  getCompanyLocks,
  lockLocationLabel,
  remoteUnlockBlockReason,
} from '@/data/selectors/lockSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { DoorLock } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { lockKindMap, lockOnlineMap } from '@/lib/statusMaps'

// ============================================================
// 企业档案 · 门锁 Tab:当前门锁 / 分配门锁 / 退租一键清退 / 分配历史。
// 退租清退 = 回收全部锁 + 该企业密码全部远程删除;通行记录保留归档(companyId 快照)。
// ============================================================

export function CompanyLocksTab({ companyId }: { companyId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const remoteUnlock = useAppStore((s) => s.remoteUnlock)
  const assignLock = useAppStore((s) => s.assignLock)
  const offboardCompanyLocks = useAppStore((s) => s.offboardCompanyLocks)

  const [assignOpen, setAssignOpen] = useState(false)
  const [offboardOpen, setOffboardOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const company = scoped.companies.find((c) => c.id === companyId)
  const locks = useMemo(() => getCompanyLocks(scoped, companyId), [scoped, companyId])
  const activePasscodes = useMemo(
    () => scoped.lockPasscodes.filter((p) => p.companyId === companyId && derivePasscodeStatus(p) !== 'deleted'),
    [scoped.lockPasscodes, companyId],
  )
  const history = useMemo(
    () =>
      scoped.lockAssignments
        .filter((a) => a.companyId === companyId)
        .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)),
    [scoped.lockAssignments, companyId],
  )
  const lockById = useMemo(() => new Map(scoped.doorLocks.map((l) => [l.id, l])), [scoped.doorLocks])

  /** 可分配:本楼栋空置单元锁 */
  const vacantLocks = useMemo(
    () =>
      scoped.doorLocks.filter(
        (l) => l.kind === 'unit' && l.buildingId === company?.buildingId && !getActiveAssignment(scoped, l.id),
      ),
    [scoped, company?.buildingId],
  )

  const openDetail = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', id)
    setSearchParams(next, { replace: true })
  }

  const doUnlock = (lock: DoorLock) => {
    const blocked = remoteUnlockBlockReason(lock)
    if (blocked) {
      toast.error(`${lock.name}:${blocked}`)
      return
    }
    if (remoteUnlock(lock.id)) toast.success(`已发送开锁指令,${lock.name} 已开门(通行记录已生成)`)
  }

  const doAssign = () => {
    for (const id of selectedIds) assignLock(id, companyId)
    toast.success(`已分配 ${selectedIds.size} 把门锁给「${company?.name}」,企业端即时可见`)
    setAssignOpen(false)
    setSelectedIds(new Set())
  }

  const doOffboard = () => {
    const { locks: n, passcodes: m } = offboardCompanyLocks(companyId)
    toast.success(`退租清退完成:回收 ${n} 把门锁(转空置),远程删除 ${m} 个密码;通行记录已归档`)
    setOffboardOpen(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <Card className="py-0">
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 border-b py-3!">
          <CardTitle className="text-sm font-medium">当前门锁({locks.length})</CardTitle>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7" onClick={() => setAssignOpen(true)}>
              <PackagePlus /> 分配门锁
            </Button>
            {locks.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-red-600 hover:text-red-600"
                onClick={() => setOffboardOpen(true)}
              >
                <PackageMinus /> 退租门锁清退
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {locks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="该企业名下暂无门锁"
                description="点击「分配门锁」从本楼栋空置锁中划拨;若企业已退租,历史分配见下方留档"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">门锁</TableHead>
                  <TableHead>在线</TableHead>
                  <TableHead>电量</TableHead>
                  <TableHead>信号</TableHead>
                  <TableHead>密码数</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {locks.map((lock) => {
                  const blocked = remoteUnlockBlockReason(lock)
                  const pcCount = activePasscodes.filter((p) => p.lockId === lock.id).length
                  return (
                    <TableRow key={lock.id} className="cursor-pointer" onClick={() => openDetail(lock.id)}>
                      <TableCell className="pl-4">
                        <p className="text-sm font-medium leading-tight">{lock.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{lockLocationLabel(lock)}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge meta={lockOnlineMap[lock.isOnline ? 'online' : 'offline']} />
                      </TableCell>
                      <TableCell>
                        <BatteryText battery={lock.battery} />
                      </TableCell>
                      <TableCell>
                        <SignalText lock={lock} />
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{pcCount}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 pr-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            disabled={!!blocked}
                            title={blocked ?? undefined}
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
        </CardContent>
      </Card>

      {/* 分配历史(含已回收留档) */}
      {history.length > 0 && (
        <Card className="py-0">
          <CardHeader className="border-b py-3!">
            <CardTitle className="text-sm font-medium">分配历史</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">门锁</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>分配时间</TableHead>
                  <TableHead>回收时间</TableHead>
                  <TableHead>状态 / 原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((a) => {
                  const lock = lockById.get(a.lockId)
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="pl-4 text-sm">{lock?.name ?? a.lockId}</TableCell>
                      <TableCell>{lock && <StatusBadge meta={lockKindMap[lock.kind]} />}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatDateTime(a.assignedAt)}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {a.revokedAt ? formatDateTime(a.revokedAt) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.revokedAt ? (
                          <span className="text-muted-foreground">已回收 · {a.revokeReason}</span>
                        ) : (
                          <span className="text-emerald-600">使用中</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 分配门锁 */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>分配门锁给 {company?.name}</DialogTitle>
            <DialogDescription>
              列出 {company?.buildingId} 栋的空置单元锁;分配后企业端即可远程开门并自助管理密码
            </DialogDescription>
          </DialogHeader>
          {vacantLocks.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              本楼栋暂无空置门锁;可先在「门锁管理」回收闲置锁,或联系工程部加装
            </p>
          ) : (
            <div className="space-y-2">
              {vacantLocks.map((lock) => (
                <div key={lock.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <Checkbox
                    id={`assign-${lock.id}`}
                    checked={selectedIds.has(lock.id)}
                    onCheckedChange={() => toggleSelect(lock.id)}
                  />
                  <Label htmlFor={`assign-${lock.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                    {lock.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">{lockLocationLabel(lock)}</span>
                  </Label>
                  <StatusBadge meta={lockOnlineMap[lock.isOnline ? 'online' : 'offline']} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              取消
            </Button>
            <Button disabled={selectedIds.size === 0} onClick={doAssign}>
              分配所选({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 退租清退确认 */}
      <AlertDialog open={offboardOpen} onOpenChange={setOffboardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认对「{company?.name}」执行退租门锁清退?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1.5">
                <p>该操作将一次性完成:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    回收 <span className="font-medium text-foreground">{locks.length} 把门锁</span> → 转为空置,可分配新企业
                  </li>
                  <li>
                    远程删除该企业 <span className="font-medium text-foreground">{activePasscodes.length} 个密码</span>
                    (含员工/访客,立即失效)
                  </li>
                  <li>通行记录保留归档,新企业不可见(隐私隔离)</li>
                </ul>
                <p className="pt-1 text-xs">对应真实对接:批量调用 TTLock 删除密码(deleteType=2)+ 本系统回收分配。</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={doOffboard}>
              确认清退
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
