import { DoorOpen, KeyRound, PackageMinus, PackagePlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BatteryText, SignalText } from '@/components/locks/lockUi'
import { PasscodeCreateDialog } from '@/components/locks/PasscodeCreateDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Timeline, type TimelineEntry } from '@/components/shared/Timeline'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  derivePasscodeStatus,
  getActiveAssignment,
  getLockAssignmentHistory,
  getLockPasscodes,
  getLockRecords,
  lockLocationLabel,
  passcodeValidityLabel,
  remoteUnlockBlockReason,
} from '@/data/selectors/lockSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { DoorLock } from '@/data/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { lockKindMap, lockOnlineMap, passcodeStatusMap, unlockMethodMap } from '@/lib/statusMaps'

/** 锁详情弹窗(?detail=LK-xxx):状态 / 分配与回收 / 分配历史 / 密码 / 最近通行 */
export function LockDetailDialog({ lock, onClose }: { lock?: DoorLock; onClose: () => void }) {
  const scoped = useScopedData()
  const remoteUnlock = useAppStore((s) => s.remoteUnlock)
  const assignLock = useAppStore((s) => s.assignLock)
  const revokeLock = useAppStore((s) => s.revokeLock)

  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [assignCompanyId, setAssignCompanyId] = useState('')

  const assignment = lock ? getActiveAssignment(scoped, lock.id) : undefined
  const assignedCompany = assignment ? scoped.companies.find((c) => c.id === assignment.companyId) : undefined
  const history = lock ? getLockAssignmentHistory(scoped, lock.id) : []
  const passcodes = lock ? getLockPasscodes(scoped, lock.id) : []
  const records = lock ? getLockRecords(scoped, lock.id, 8) : []

  /** 分配历史 → 时间线(升序,当前态在末尾高亮) */
  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = []
    for (const a of [...history].reverse()) {
      entries.push({
        key: `${a.id}-assign`,
        title: `分配给 ${a.companyNameSnapshot}`,
        at: a.assignedAt,
        by: a.assignedBy,
      })
      if (a.revokedAt) {
        entries.push({
          key: `${a.id}-revoke`,
          title: '回收(转为空置)',
          at: a.revokedAt,
          by: a.revokedBy ?? '物业',
          content: a.revokeReason,
        })
      }
    }
    return entries
  }, [history])

  if (!lock) return null
  const blocked = remoteUnlockBlockReason(lock)

  const doUnlock = () => {
    if (blocked) {
      toast.error(`${lock.name}:${blocked}`)
      return
    }
    if (remoteUnlock(lock.id)) toast.success(`已发送开锁指令,${lock.name} 已开门(通行记录已生成)`)
  }

  const doAssign = () => {
    if (!assignCompanyId) return
    assignLock(lock.id, assignCompanyId)
    const name = scoped.companies.find((c) => c.id === assignCompanyId)?.name
    toast.success(`已将 ${lock.name} 分配给「${name}」`)
    setAssignOpen(false)
    setAssignCompanyId('')
  }

  const doRevoke = () => {
    revokeLock(lock.id, '单锁回收调整')
    toast.success(`已回收 ${lock.name}(该企业在此锁上的密码已一并删除),锁转为空置`)
    setRevokeOpen(false)
  }

  /** 可分配对象:锁所在楼栋的企业优先,其余靠后 */
  const assignOptions = [...scoped.companies].sort((a, b) => {
    const sameA = a.buildingId === lock.buildingId ? 0 : 1
    const sameB = b.buildingId === lock.buildingId ? 0 : 1
    return sameA - sameB || a.id.localeCompare(b.id)
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {lock.name}
            <StatusBadge meta={lockKindMap[lock.kind]} />
            <StatusBadge meta={lockOnlineMap[lock.isOnline ? 'online' : 'offline']} />
          </DialogTitle>
          <DialogDescription>
            {lockLocationLabel(lock)} · SN {lock.sn} · {lock.model} · {formatDate(lock.installedAt)} 安装
          </DialogDescription>
        </DialogHeader>

        {/* 状态卡 + 远程开锁 */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 p-3">
          <div>
            <p className="text-xs text-muted-foreground">电量</p>
            <BatteryText battery={lock.battery} className="mt-0.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">WiFi 信号</p>
            <div className="mt-0.5">
              <SignalText lock={lock} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">省电模式</p>
            <p className={`mt-0.5 text-sm ${lock.powerSavingMode ? 'text-amber-600' : ''}`}>
              {lock.powerSavingMode ? '开启(不支持远程指令)' : '关闭(保持长连接)'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">远程开锁开关</p>
            <p className="mt-0.5 text-sm">{lock.remoteUnlockEnabled ? '已开启' : '未开启'}</p>
          </div>
          <div className="ml-auto">
            <Button size="sm" disabled={!!blocked} title={blocked ?? undefined} onClick={doUnlock}>
              <DoorOpen /> 远程开锁
            </Button>
          </div>
        </div>

        {/* 当前分配(仅单元锁) */}
        {lock.kind === 'unit' && (
          <div className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">当前分配</p>
              {assignment ? (
                <>
                  <span className="text-sm">{assignedCompany?.name ?? assignment.companyNameSnapshot}</span>
                  <span className="text-xs text-muted-foreground">
                    自 {formatDate(assignment.assignedAt)} · {assignment.assignedBy} 操作
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 text-red-600 hover:text-red-600"
                    onClick={() => setRevokeOpen(true)}
                  >
                    <PackageMinus /> 回收
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">空置(未分配企业)</span>
                  <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => setAssignOpen(true)}>
                    <PackagePlus /> 分配给企业
                  </Button>
                </>
              )}
            </div>
            {history.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="mb-2 text-xs font-medium text-muted-foreground">分配历史</p>
                <Timeline entries={timelineEntries} />
              </>
            )}
          </div>
        )}

        {/* 密码 */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-medium">密码({passcodes.length})</p>
            <Button size="sm" variant="outline" className="h-7" onClick={() => setCreateOpen(true)}>
              <KeyRound /> 新增密码
            </Button>
          </div>
          {passcodes.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">该锁暂无密码</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3">名称</TableHead>
                  <TableHead>密码</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passcodes.map((pc) => (
                  <TableRow key={pc.id}>
                    <TableCell className="pl-3 text-sm">{pc.name}</TableCell>
                    <TableCell className="font-mono text-sm">{pc.code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{passcodeValidityLabel(pc)}</TableCell>
                    <TableCell>
                      <StatusBadge meta={passcodeStatusMap[derivePasscodeStatus(pc)]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 最近通行 */}
        <div className="rounded-lg border">
          <p className="border-b px-3 py-2 text-sm font-medium">最近通行(8 条)</p>
          {records.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">暂无通行记录</p>
          ) : (
            <ul className="divide-y">
              {records.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(r.at)}</span>
                  <StatusBadge meta={unlockMethodMap[r.method]} />
                  <span className="text-sm">{r.actorLabel}</span>
                  <span className={`ml-auto text-xs ${r.success ? 'text-emerald-600' : 'font-medium text-red-600'}`}>
                    {r.success ? '成功' : '失败'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 分配企业 */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>分配 {lock.name}</DialogTitle>
              <DialogDescription>
                {history.length > 0
                  ? `上一家「${history[0].companyNameSnapshot}」已于 ${formatDate(history[0].revokedAt ?? '')} 退租清退,原密码均已删除`
                  : '分配后企业端即可远程开门并自助管理密码'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>选择企业(同楼栋优先)</Label>
              <Select value={assignCompanyId} onValueChange={setAssignCompanyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择企业" />
                </SelectTrigger>
                <SelectContent>
                  {assignOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}({c.buildingId} 栋{c.buildingId === lock.buildingId ? ' · 同楼栋' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                取消
              </Button>
              <Button disabled={!assignCompanyId} onClick={doAssign}>
                确认分配
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 回收确认 */}
        <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>回收 {lock.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                将结束「{assignedCompany?.name ?? assignment?.companyNameSnapshot}」的分配,并远程删除该企业在此锁上的全部密码;
                通行记录保留归档。锁转为空置后可分配给新企业。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={doRevoke}>
                确认回收
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PasscodeCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          locks={[lock]}
          fixedLockId={lock.id}
        />
      </DialogContent>
    </Dialog>
  )
}
