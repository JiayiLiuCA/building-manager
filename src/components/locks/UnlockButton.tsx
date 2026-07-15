import { CircleCheck, DoorOpen, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/data/store'
import type { DoorLock } from '@/data/types'
import { cn } from '@/lib/utils'
import { remoteUnlockBlockReason } from '@/data/selectors/lockSelectors'

// ============================================================
// 一键开门按钮(企业端主交互):idle → 开门中(~800ms)→ 已开门(2s)→ 复原。
// 离线/省电模式禁用并给出原因;成功即写通行记录(store.remoteUnlock)。
// ============================================================

type Phase = 'idle' | 'opening' | 'done'

export function UnlockButton({ lock, size = 'default' }: { lock: DoorLock; size?: 'default' | 'lg' }) {
  const remoteUnlock = useAppStore((s) => s.remoteUnlock)
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const blocked = remoteUnlockBlockReason(lock)

  const onClick = () => {
    if (blocked || phase !== 'idle') return
    setPhase('opening')
    timers.current.push(
      window.setTimeout(() => {
        const ok = remoteUnlock(lock.id)
        if (!ok) {
          setPhase('idle')
          toast.error(`${lock.name}:开锁指令下发失败,请稍后重试`)
          return
        }
        setPhase('done')
        toast.success(`${lock.name} 已开门`)
        timers.current.push(window.setTimeout(() => setPhase('idle'), 2000))
      }, 800),
    )
  }

  if (blocked) {
    return (
      <Button size={size} variant="outline" disabled title={blocked} className={cn(size === 'lg' && 'h-11 px-6')}>
        <DoorOpen /> 设备离线
      </Button>
    )
  }

  return (
    <Button
      size={size}
      onClick={onClick}
      disabled={phase === 'opening'}
      className={cn(
        size === 'lg' && 'h-11 px-6 text-base',
        phase === 'done' && 'bg-emerald-600 hover:bg-emerald-600',
      )}
    >
      {phase === 'idle' && (
        <>
          <DoorOpen /> 一键开门
        </>
      )}
      {phase === 'opening' && (
        <>
          <LoaderCircle className="animate-spin" /> 开门中…
        </>
      )}
      {phase === 'done' && (
        <>
          <CircleCheck /> 已开门
        </>
      )}
    </Button>
  )
}
