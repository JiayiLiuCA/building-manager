import { BatteryFull, BatteryLow, BatteryMedium, Wifi, WifiOff } from 'lucide-react'
import type { DoorLock } from '@/data/types'
import { cn } from '@/lib/utils'

// ============================================================
// 门锁小件(两端共用):电量着色、信号文案、在线点。
// ============================================================

export function BatteryText({ battery, className }: { battery: number; className?: string }) {
  const tone = battery <= 20 ? 'text-red-600' : battery <= 50 ? 'text-amber-600' : 'text-emerald-600'
  const Icon = battery <= 20 ? BatteryLow : battery <= 50 ? BatteryMedium : BatteryFull
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm tabular-nums', tone, className)}>
      <Icon className="size-4" />
      {battery}%
    </span>
  )
}

const RSSI_LABEL: Record<DoorLock['rssiGrade'], string> = { 3: '强', 2: '中', 1: '弱', 0: '—' }

export function SignalText({ lock }: { lock: DoorLock }) {
  if (!lock.isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <WifiOff className="size-3.5" /> —
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Wifi className="size-3.5" /> {RSSI_LABEL[lock.rssiGrade]}
    </span>
  )
}
