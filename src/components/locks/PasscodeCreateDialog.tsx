import { Copy, KeyRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PARK_NAME } from '@/data/constants'
import { getActiveAssignment, lockLocationLabel } from '@/data/selectors/lockSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { DoorLock, PasscodeKind, PasscodePurpose, PasscodeType } from '@/data/types'
import { DEMO_TODAY } from '@/lib/date'
import { passcodePurposeMap, passcodeTypeMap } from '@/lib/statusMaps'

// ============================================================
// 生成密码弹窗(两端共用):表单 → (随机密码)结果页大号展示 + 复制话术。
// 随机密码不要求锁在线;自定义密码需锁在线(对应 TTLock addType=2 语义)。
// visitorPreset 用于企业端「生成访客密码」快捷流。
// ============================================================

const RANDOM_TYPES: PasscodeType[] = ['once', 'period', 'permanent', 'cycle_daily', 'cycle_weekday', 'cycle_weekend']
const CUSTOM_TYPES: PasscodeType[] = ['period', 'permanent']

interface PasscodeCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 可选锁(调用方已按端/权限过滤;企业端只传自己的单元锁) */
  locks: DoorLock[]
  /** 固定锁(锁详情内新增时锁定选择) */
  fixedLockId?: string
  /** 企业端传自己的 companyId;物业端不传 → 归属自动取锁的当前分配企业 */
  forCompanyId?: string
  /** 访客快捷模式:预填 访客用途 + 今天 9:00-18:00 随机限期密码 */
  visitorPreset?: boolean
}

export function PasscodeCreateDialog({
  open,
  onOpenChange,
  locks,
  fixedLockId,
  forCompanyId,
  visitorPreset,
}: PasscodeCreateDialogProps) {
  const scoped = useScopedData()
  const createRandomPasscode = useAppStore((s) => s.createRandomPasscode)
  const createCustomPasscode = useAppStore((s) => s.createCustomPasscode)

  const [lockId, setLockId] = useState(fixedLockId ?? locks[0]?.id ?? '')
  const [kind, setKind] = useState<PasscodeKind>('random')
  const [type, setType] = useState<PasscodeType>(visitorPreset ? 'period' : 'period')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [purpose, setPurpose] = useState<PasscodePurpose>(visitorPreset ? 'visitor' : 'staff')
  const [startAt, setStartAt] = useState(`${DEMO_TODAY}T09:00`)
  const [endAt, setEndAt] = useState(`${DEMO_TODAY}T18:00`)
  /** 随机密码创建成功后进入结果页 */
  const [result, setResult] = useState<{ code: string; name: string } | null>(null)

  const selectedLock = locks.find((l) => l.id === (fixedLockId ?? lockId))
  const typeOptions = kind === 'random' ? RANDOM_TYPES : CUSTOM_TYPES
  const needEnd = type !== 'permanent' && type !== 'once'
  const codeValid = kind === 'random' || /^\d{4,9}$/.test(code)
  const rangeValid = !needEnd || (!!endAt && endAt > startAt)
  const valid = !!selectedLock && !!name.trim() && codeValid && !!startAt && rangeValid

  const companyId = useMemo(() => {
    if (forCompanyId) return forCompanyId
    if (!selectedLock) return undefined
    return getActiveAssignment(scoped, selectedLock.id)?.companyId
  }, [forCompanyId, selectedLock, scoped])

  const reset = () => {
    setResult(null)
    setName('')
    setCode('')
    setKind('random')
    setType('period')
    setPurpose(visitorPreset ? 'visitor' : 'staff')
    setStartAt(`${DEMO_TODAY}T09:00`)
    setEndAt(`${DEMO_TODAY}T18:00`)
    if (!fixedLockId) setLockId(locks[0]?.id ?? '')
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const submit = () => {
    if (!selectedLock || !valid) return
    const base = {
      lockId: selectedLock.id,
      name: name.trim(),
      startAt: `${startAt}:00`,
      endAt: needEnd ? `${endAt}:00` : undefined,
      purpose,
      companyId,
    }
    if (kind === 'random') {
      const created = createRandomPasscode({ ...base, type })
      if (!created) return
      setResult({ code: created.code, name: base.name })
      toast.success('随机密码已生成(云端算法生成,无需锁在线)')
    } else {
      const id = createCustomPasscode({ ...base, code, type: type as 'period' | 'permanent' })
      if (!id) {
        toast.error(`${selectedLock.name} 当前离线,自定义密码需通过 WiFi 写入锁内,请稍后重试`)
        return
      }
      toast.success(`自定义密码已通过 WiFi 远程写入 ${selectedLock.name}`)
      close(false)
    }
  }

  const copyScript = () => {
    if (!result || !selectedLock) return
    const validity =
      type === 'permanent'
        ? '长期有效'
        : `有效期 ${startAt.slice(5, 10).replace('-', ' 月 ')} 日 ${startAt.slice(11, 16)}-${endAt.slice(11, 16)}`
    const script = `【${PARK_NAME}】您好:您的${passcodePurposeMap[purpose]}密码为 ${result.code},${validity},请在 ${selectedLock.name}(${lockLocationLabel(selectedLock)})键盘输入密码后按 # 开门。`
    navigator.clipboard?.writeText(script).catch(() => {})
    toast.success('邀请话术已复制,可直接微信/短信发送')
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>密码已生成</DialogTitle>
              <DialogDescription>{result.name} · {selectedLock?.name}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/40 py-6 text-center">
              <p className="text-4xl font-semibold tracking-[0.3em] tabular-nums">{result.code}</p>
              <p className="mt-2 text-xs text-muted-foreground">门锁键盘输入密码后按 # 开门</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                完成
              </Button>
              <Button onClick={copyScript}>
                <Copy /> 复制邀请话术
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{visitorPreset ? '生成访客密码' : '生成密码'}</DialogTitle>
              <DialogDescription>
                随机密码由云端生成、无需锁在线;自定义密码经 WiFi 远程写入锁内,要求设备在线
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>门锁</Label>
                <Select value={fixedLockId ?? lockId} onValueChange={setLockId} disabled={!!fixedLockId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择门锁" />
                  </SelectTrigger>
                  <SelectContent>
                    {locks.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {!l.isOnline && '(离线)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>密码方案</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => {
                      setKind(v as PasscodeKind)
                      if (v === 'custom' && !CUSTOM_TYPES.includes(type)) setType('period')
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">随机密码(云端生成)</SelectItem>
                      <SelectItem value="custom">自定义密码(远程写入)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>类型</Label>
                  <Select value={type} onValueChange={(v) => setType(v as PasscodeType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {passcodeTypeMap[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>密码名称</Label>
                  <Input
                    placeholder="建议:企业-用途-人名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>用途</Label>
                  <Select value={purpose} onValueChange={(v) => setPurpose(v as PasscodePurpose)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(passcodePurposeMap) as PasscodePurpose[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {passcodePurposeMap[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {kind === 'custom' && (
                <div className="space-y-1.5">
                  <Label>自定义密码(4-9 位数字)</Label>
                  <Input
                    placeholder="如 8823"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  />
                  {!!code && !codeValid && <p className="text-xs text-red-600">请输入 4-9 位数字</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{type.startsWith('cycle') ? '生效开始(取每日时段起点)' : '生效开始'}</Label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                {needEnd && (
                  <div className="space-y-1.5">
                    <Label>{type.startsWith('cycle') ? '失效截止(取每日时段终点)' : '生效截止'}</Label>
                    <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                  </div>
                )}
              </div>
              {type === 'once' && (
                <p className="text-xs text-muted-foreground">单次密码在开始时间后 6 小时内可使用一次</p>
              )}
              {!rangeValid && <p className="text-xs text-red-600">截止时间需晚于开始时间</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                取消
              </Button>
              <Button disabled={!valid} onClick={submit}>
                <KeyRound /> 生成
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
