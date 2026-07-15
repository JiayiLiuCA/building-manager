import { Ban, CircleCheck, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { derivePasscodeStatus, passcodeValidityLabel } from '@/data/selectors/lockSelectors'
import { useAppStore } from '@/data/store'
import type { DoorLock, LockPasscode } from '@/data/types'
import { passcodeKindMap, passcodeStatusMap, passcodeTypeMap } from '@/lib/statusMaps'

// ============================================================
// 密码表格 + 行内操作(两端共用):禁用/启用(软禁用语义)、修改、删除(软删除)。
// 物业端展示创建端与归属企业列;企业端 compact 模式隐藏。
// ============================================================

interface PasscodeTableProps {
  passcodes: LockPasscode[]
  lockById: Map<string, DoorLock>
  /** 企业端紧凑模式:隐藏归属/创建端列 */
  compact?: boolean
  /** 展示归属企业名(物业端) */
  companyNameById?: Map<string, string>
}

export function PasscodeTable({ passcodes, lockById, compact, companyNameById }: PasscodeTableProps) {
  const setPasscodeDisabled = useAppStore((s) => s.setPasscodeDisabled)
  const deletePasscode = useAppStore((s) => s.deletePasscode)
  const updatePasscode = useAppStore((s) => s.updatePasscode)

  const [editing, setEditing] = useState<LockPasscode | null>(null)
  const [deleting, setDeleting] = useState<LockPasscode | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const openEdit = (pc: LockPasscode) => {
    setEditing(pc)
    setEditName(pc.name)
    setEditCode(pc.code)
    setEditStart(pc.startAt.slice(0, 16))
    setEditEnd(pc.endAt?.slice(0, 16) ?? '')
  }

  const editCodeValid = /^\d{4,9}$/.test(editCode)
  const editValid = !!editName.trim() && editCodeValid && (!editing?.endAt || editEnd > editStart)

  const saveEdit = () => {
    if (!editing || !editValid) return
    updatePasscode(editing.id, {
      name: editName.trim(),
      code: editCode,
      startAt: `${editStart}:00`,
      endAt: editing.endAt ? `${editEnd}:00` : undefined,
    })
    toast.success('修改已通过 WiFi 远程下发生效(changeType=2)')
    setEditing(null)
  }

  const toggleDisabled = (pc: LockPasscode) => {
    const disabled = !pc.disabledAt
    setPasscodeDisabled(pc.id, disabled)
    toast.success(
      disabled
        ? `已禁用「${pc.name}」:有效期已远程挂起,可随时恢复`
        : `已恢复「${pc.name}」,密码重新生效`,
    )
  }

  const confirmDelete = () => {
    if (!deleting) return
    deletePasscode(deleting.id)
    toast.success(`已通过 WiFi 从锁内删除「${deleting.name}」(记录保留归档)`)
    setDeleting(null)
  }

  if (passcodes.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="暂无密码" description="点击右上角「生成密码」为门锁下发随机或自定义密码" />
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">密码名称</TableHead>
            <TableHead>门锁</TableHead>
            <TableHead>方案 / 类型</TableHead>
            <TableHead>密码</TableHead>
            <TableHead>有效期</TableHead>
            {!compact && <TableHead>归属 / 创建</TableHead>}
            <TableHead>状态</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {passcodes.map((pc) => {
            const status = derivePasscodeStatus(pc)
            const lock = lockById.get(pc.lockId)
            const deleted = status === 'deleted'
            const canOperate = !deleted
            return (
              <TableRow key={pc.id} className={deleted ? 'opacity-55' : undefined}>
                <TableCell className="pl-4 text-sm font-medium">{pc.name}</TableCell>
                <TableCell className="text-sm">{lock?.name ?? pc.lockId}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge meta={passcodeKindMap[pc.kind]} />
                    <span className="text-xs text-muted-foreground">{passcodeTypeMap[pc.type]}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{pc.code}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{passcodeValidityLabel(pc)}</TableCell>
                {!compact && (
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{(pc.companyId && companyNameById?.get(pc.companyId)) ?? '园区公共'}</p>
                    <p className="mt-0.5">
                      {pc.createdBy} · {pc.createdByRole === 'property' ? '物业端' : '企业端'}
                    </p>
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge meta={passcodeStatusMap[status]} />
                </TableCell>
                <TableCell>
                  {canOperate && (
                    <div className="flex items-center justify-end gap-0.5 pr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title={pc.disabledAt ? '恢复启用' : '禁用(可恢复)'}
                        onClick={() => toggleDisabled(pc)}
                      >
                        {pc.disabledAt ? <CircleCheck className="size-3.5" /> : <Ban className="size-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="修改"
                        onClick={() => openEdit(pc)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-600 hover:text-red-600"
                        title="删除"
                        onClick={() => setDeleting(pc)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* 修改密码 */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              名称、密码与有效期均可单独修改,经 WiFi 远程下发即时生效
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>密码名称</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>密码(4-9 位数字)</Label>
              <Input
                inputMode="numeric"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.replace(/\D/g, '').slice(0, 9))}
              />
              {!!editCode && !editCodeValid && <p className="text-xs text-red-600">请输入 4-9 位数字</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>生效开始</Label>
                <Input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              {editing?.endAt && (
                <div className="space-y-1.5">
                  <Label>生效截止</Label>
                  <Input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button disabled={!editValid} onClick={saveEdit}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除密码 */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除密码「{deleting?.name}」?</AlertDialogTitle>
            <AlertDialogDescription>
              将通过 WiFi 从锁内远程删除(deleteType=2),删除后该密码立即无法开门;操作记录保留归档,不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
