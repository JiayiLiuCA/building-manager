import { demoNow } from '../../lib/date'
import type { DoorLock, LockAssignment, LockPasscode, PasscodeStatus, UnlockRecord } from '../types'

// ============================================================
// 门锁派生逻辑:当前分配由 lockAssignments 派生(锁上不落库),
// 密码状态由时间与软删除/软禁用标记派生 —— 与工单「事件派生状态」同款纪律。
// 范围过滤统一走 scope.ts,本文件的入参默认已经过 scope。
// ============================================================

export interface LockSlice {
  doorLocks: DoorLock[]
  lockAssignments: LockAssignment[]
  lockPasscodes: LockPasscode[]
  unlockRecords: UnlockRecord[]
}

/** 锁的当前分配记录(revokedAt 为空的那条);无 = 空置/公共 */
export function getActiveAssignment(state: LockSlice, lockId: string): LockAssignment | undefined {
  return state.lockAssignments.find((a) => a.lockId === lockId && !a.revokedAt)
}

/** 当前分配给某企业的全部锁(单元锁) */
export function getCompanyLocks(state: LockSlice, companyId: string): DoorLock[] {
  const lockIds = new Set(
    state.lockAssignments.filter((a) => a.companyId === companyId && !a.revokedAt).map((a) => a.lockId),
  )
  return state.doorLocks.filter((l) => lockIds.has(l.id))
}

/** 锁的分配历史(含已回收),新的在前 */
export function getLockAssignmentHistory(state: LockSlice, lockId: string): LockAssignment[] {
  return state.lockAssignments
    .filter((a) => a.lockId === lockId)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

export function derivePasscodeStatus(pc: LockPasscode, nowIso = demoNow()): PasscodeStatus {
  if (pc.deletedAt) return 'deleted'
  if (pc.disabledAt) return 'disabled'
  if (nowIso < pc.startAt) return 'pending'
  if (pc.endAt && pc.endAt < nowIso) return 'expired'
  return 'active'
}

/** 某锁的密码(默认过滤已删除),新的在前 */
export function getLockPasscodes(state: LockSlice, lockId: string, includeDeleted = false): LockPasscode[] {
  return state.lockPasscodes
    .filter((p) => p.lockId === lockId && (includeDeleted || !p.deletedAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 某锁的通行记录,新的在前 */
export function getLockRecords(state: LockSlice, lockId: string, limit?: number): UnlockRecord[] {
  const list = state.unlockRecords.filter((r) => r.lockId === lockId).sort((a, b) => b.at.localeCompare(a.at))
  return limit ? list.slice(0, limit) : list
}

export function isLowBattery(lock: DoorLock): boolean {
  return lock.battery <= 20
}

/** 远程开锁不可用原因;可用返回 null(按钮禁用与 toast 共用口径,错误码对应 TTLock 文档) */
export function remoteUnlockBlockReason(lock: DoorLock): string | null {
  if (!lock.isOnline) return '设备离线'
  if (lock.powerSavingMode) return '省电模式下云端无法主动下发指令(-3035)'
  if (!lock.remoteUnlockEnabled) return '未开启远程开锁开关(-4043)'
  return null
}

/** 设备总览 KPI(入参为 scope 过滤后的切片) */
export function getLockKpis(state: LockSlice) {
  const locks = state.doorLocks
  const today = demoNow().slice(0, 10)
  const weekAgo = new Date(`${today}T00:00:00`)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoIso = weekAgo.toISOString().slice(0, 10)
  const lockIds = new Set(locks.map((l) => l.id))
  const records = state.unlockRecords.filter((r) => lockIds.has(r.lockId))
  return {
    total: locks.length,
    online: locks.filter((l) => l.isOnline).length,
    lowBattery: locks.filter(isLowBattery).length,
    todayUnlocks: records.filter((r) => r.at.slice(0, 10) === today && r.success).length,
    weekFailures: records.filter((r) => !r.success && r.at.slice(0, 10) >= weekAgoIso).length,
  }
}

/** 锁的位置文案:'A 区 A1 栋 3 层 301' / 'B 区 B2 栋 一层大堂' */
export function lockLocationLabel(lock: DoorLock): string {
  const floorPart = lock.floor ? ` ${lock.floor} 层` : ''
  return `${lock.zoneId} 区 ${lock.buildingId} 栋${floorPart} ${lock.doorLabel}`
}

const CYCLE_LABEL: Partial<Record<LockPasscode['type'], string>> = {
  cycle_daily: '每日',
  cycle_weekday: '工作日',
  cycle_weekend: '周末',
}

/** 密码有效期文案(循环类型显示每日时段) */
export function passcodeValidityLabel(pc: LockPasscode): string {
  const d = (iso?: string) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : '')
  if (pc.type === 'permanent') return `${d(pc.startAt)} 起永久`
  if (pc.type === 'once') return `${d(pc.startAt)} 起 6 小时内单次`
  const cycle = CYCLE_LABEL[pc.type]
  if (cycle && pc.endAt) return `${cycle} ${pc.startAt.slice(11, 16)}-${pc.endAt.slice(11, 16)}(至 ${pc.endAt.slice(0, 10)})`
  return `${d(pc.startAt)} ~ ${d(pc.endAt)}`
}
