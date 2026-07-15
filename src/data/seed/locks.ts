import { dateDaysAgo, daysAgo, monthDay } from '../../lib/date'
import { pick, randInt, type Rng } from '../../lib/prng'
import type {
  Company,
  CsLockAssignment,
  DoorLock,
  LockAssignment,
  LockPasscode,
  UnlockMethod,
  UnlockRecord,
} from '../types'
import { BUILDINGS, DEFAULT_CS_ZONES, STORY_COMPANY_IDS } from './constants'
import { zoneCsName } from './generators'

// ============================================================
// 门锁 seed:锁资产(单元/大门/公共)、分配记录(含迁出企业历史)、
// 密码(生效中/未生效/已禁用/已过期全态)、近 30 天通行记录。
// 故事线:①云脉智能(访客密码/一键开门) ③洄澜餐饮(低电量+6/5 夜连续失败)
// 换租链:B2 栋 101/201 曾属「星辰视讯(已迁出)」,2025-12 退租清退 → 2026-01 分配现企业。
// ============================================================

/** 迁出企业占位 id(companies 中不存在,展示一律用 companyNameSnapshot) */
const EX_TENANT_ID = 'C-EX1'
const EX_TENANT_NAME = '星辰视讯(已迁出)'
/** 换租故事主角:联创电子(B2 1 层)、卓立仪器(B2 2 层) */
const REASSIGNED_COMPANY_IDS = new Set(['C-14', 'C-15'])
/** 离线锁(演示离线态,均为非故事企业) */
const OFFLINE_COMPANY_FIRST_LOCK = new Set(['C-08', 'C-19', 'C-27'])

const LOCK_MODELS = ['TTLock WiFi S31', 'TTLock WiFi K3'] as const

export interface LockSeedData {
  doorLocks: DoorLock[]
  lockAssignments: LockAssignment[]
  lockPasscodes: LockPasscode[]
  unlockRecords: UnlockRecord[]
  csLockAssignments: CsLockAssignment[]
}

/** 企业的单元锁位置:whole=大堂+办公区;partial=每占用楼层 1 把(上限 2),门牌取 unitLabel 首号 */
function unitDoorSpots(c: Company): { floor: number; label: string }[] {
  if (c.occupancy.type === 'whole') {
    return [
      { floor: 1, label: '一层大堂' },
      { floor: 2, label: '办公区大门' },
    ]
  }
  const floors = c.occupancy.floors.slice(0, 2)
  const doorNo = c.occupancy.unitLabel.match(/层\s*(\d{3})/)
  if (doorNo && floors.length === 1) return [{ floor: floors[0], label: doorNo[1] }]
  return floors.map((f) => ({ floor: f, label: `${f}01` }))
}

function lockName(buildingId: string, label: string): string {
  return /^\d/.test(label) ? `${buildingId} 栋 ${label} 门锁` : `${buildingId} 栋${label}门锁`
}

function genSn(rng: Rng): string {
  const hex = '0123456789ABCDEF'
  let s = ''
  for (let i = 0; i < 6; i++) s += hex[randInt(rng, 0, 15)]
  return `TTL-${s}`
}

function genInstalledAt(rng: Rng): string {
  return monthDay(`${randInt(rng, 2024, 2025)}-${String(randInt(rng, 1, 12)).padStart(2, '0')}`, randInt(rng, 2, 27))
}

/** 通行方式权重:密码 55% / 蓝牙 25% / IC 卡 10% / 远程 7% / 指纹 3% */
function pickMethod(rng: Rng): UnlockMethod {
  const r = rng()
  if (r < 0.55) return 'passcode'
  if (r < 0.8) return 'app_ble'
  if (r < 0.9) return 'ic_card'
  if (r < 0.97) return 'remote'
  return 'fingerprint'
}

export function genLockData(companies: Company[], rng: Rng): LockSeedData {
  const doorLocks: DoorLock[] = []
  const lockAssignments: LockAssignment[] = []
  const lockPasscodes: LockPasscode[] = []
  const rawRecords: Omit<UnlockRecord, 'id'>[] = []

  const storyIds = new Set<string>(Object.values(STORY_COMPANY_IDS))
  /** 企业 → 名下锁(生成顺序) */
  const companyLocks = new Map<string, DoorLock[]>()
  let lockSeq = 0
  let assignmentSeq = 0
  let passcodeSeq = 0

  const nextLock = () => `LK-${String(++lockSeq).padStart(3, '0')}`
  const nextAssignment = () => `LA-${String(++assignmentSeq).padStart(3, '0')}`
  const nextPasscode = () => `PC-${String(++passcodeSeq).padStart(4, '0')}`

  // ===== 1. 企业单元锁 + 分配记录 =====
  for (const company of companies) {
    const spots = unitDoorSpots(company)
    const locks: DoorLock[] = []
    for (const [i, spot] of spots.entries()) {
      const offline = i === 0 && OFFLINE_COMPANY_FIRST_LOCK.has(company.id)
      const lock: DoorLock = {
        id: nextLock(),
        name: lockName(company.buildingId, spot.label),
        kind: 'unit',
        zoneId: company.zoneId,
        buildingId: company.buildingId,
        floor: spot.floor,
        doorLabel: spot.label,
        sn: genSn(rng),
        model: pick(rng, LOCK_MODELS),
        installedAt: genInstalledAt(rng),
        isOnline: !offline,
        // 故事③洄澜餐饮首把锁低电量(企业端「一键报修」素材);其余 45-98
        battery: company.id === STORY_COMPANY_IDS.three && i === 0 ? 15 : randInt(rng, 45, 98),
        rssiGrade: offline ? 0 : (pick(rng, [3, 3, 3, 2]) as 2 | 3),
        remoteUnlockEnabled: true,
        powerSavingMode: false,
      }
      doorLocks.push(lock)
      locks.push(lock)

      // 换租故事锁:先补一段「星辰视讯」的已回收分配
      if (REASSIGNED_COMPANY_IDS.has(company.id)) {
        lockAssignments.push({
          id: nextAssignment(),
          lockId: lock.id,
          companyId: EX_TENANT_ID,
          companyNameSnapshot: EX_TENANT_NAME,
          assignedAt: '2024-03-06T10:00:00',
          assignedBy: '王琳',
          revokedAt: '2025-12-20T15:30:00',
          revokedBy: '王琳',
          revokeReason: '企业退租清退',
        })
      }
      lockAssignments.push({
        id: nextAssignment(),
        lockId: lock.id,
        companyId: company.id,
        companyNameSnapshot: company.name,
        assignedAt: REASSIGNED_COMPANY_IDS.has(company.id)
          ? '2026-01-06T10:00:00'
          : monthDay(company.contractStart, randInt(rng, 3, 12)),
        assignedBy: zoneCsName(company.zoneId),
      })
    }
    companyLocks.set(company.id, locks)
  }

  // ===== 2. 楼栋大门锁 + 公共区域锁 =====
  const gateByBuilding = new Map<string, DoorLock>()
  for (const b of BUILDINGS) {
    const gate: DoorLock = {
      id: nextLock(),
      name: `${b.id} 栋大门门锁`,
      kind: 'building_gate',
      zoneId: b.zoneId,
      buildingId: b.id,
      doorLabel: '大门',
      sn: genSn(rng),
      model: pick(rng, LOCK_MODELS),
      installedAt: genInstalledAt(rng),
      isOnline: true,
      battery: b.id === 'B4' ? 12 : randInt(rng, 40, 95),
      rssiGrade: pick(rng, [3, 3, 2]) as 2 | 3,
      remoteUnlockEnabled: true,
      powerSavingMode: false,
    }
    doorLocks.push(gate)
    gateByBuilding.set(b.id, gate)
  }

  const publicDefs: { buildingId: string; label: string; lowBattery?: boolean; powerSaving?: boolean }[] = [
    { buildingId: 'A1', label: '消防控制室' },
    { buildingId: 'A4', label: '强电井', lowBattery: true },
    { buildingId: 'B2', label: '配电房' },
    { buildingId: 'B5', label: '水泵房' },
    { buildingId: 'C1', label: '设备机房' },
    { buildingId: 'C4', label: '仓库', powerSaving: true },
  ]
  const publicLocks: DoorLock[] = []
  for (const def of publicDefs) {
    const b = BUILDINGS.find((x) => x.id === def.buildingId)!
    const lock: DoorLock = {
      id: nextLock(),
      name: `${b.zoneId} 区${def.label}门锁`,
      kind: 'public',
      zoneId: b.zoneId,
      buildingId: def.buildingId,
      doorLabel: def.label,
      sn: genSn(rng),
      model: pick(rng, LOCK_MODELS),
      installedAt: genInstalledAt(rng),
      isOnline: true,
      battery: def.lowBattery ? 18 : randInt(rng, 40, 95),
      rssiGrade: pick(rng, [3, 2, 2]) as 2 | 3,
      remoteUnlockEnabled: true,
      // 省电模式锁:云端不能主动下发指令(远程开锁按钮禁用文案素材,对应错误码 -3035)
      powerSavingMode: def.powerSaving ?? false,
    }
    doorLocks.push(lock)
    publicLocks.push(lock)
  }

  // ===== 3. 密码 =====
  const companyById = new Map(companies.map((c) => [c.id, c]))
  const addPasscode = (
    input: Omit<LockPasscode, 'id' | 'createdAt' | 'createdBy' | 'createdByRole'> & {
      createdAt?: string
      createdBy?: string
      createdByRole?: 'property' | 'company'
    },
  ) => {
    const company = input.companyId ? companyById.get(input.companyId) : undefined
    lockPasscodes.push({
      id: nextPasscode(),
      createdAt: input.createdAt ?? input.startAt,
      createdBy: input.createdBy ?? company?.contactName ?? '物业',
      createdByRole: input.createdByRole ?? (company ? 'company' : 'property'),
      ...input,
    })
  }

  const one = companyLocks.get(STORY_COMPANY_IDS.one)! // 云脉智能:2 把
  const two = companyLocks.get(STORY_COMPANY_IDS.two)! // 精工精密:2 把
  const three = companyLocks.get(STORY_COMPANY_IDS.three)! // 洄澜餐饮:1 把

  addPasscode({
    lockId: one[0].id, kind: 'custom', type: 'permanent', name: '云脉智能-前台-通用', code: '308126',
    startAt: '2026-01-06T09:00:00', purpose: 'staff', companyId: STORY_COMPANY_IDS.one,
  })
  // 今天(2026-06-06)生效中的访客密码 —— 企业端故事主角
  addPasscode({
    lockId: one[0].id, kind: 'random', type: 'period', name: '云脉智能-访客-张先生', code: '458923',
    startAt: daysAgo(0, '09:00'), endAt: daysAgo(0, '18:00'), purpose: 'visitor',
    companyId: STORY_COMPANY_IDS.one, createdAt: daysAgo(1, '16:20'),
  })
  addPasscode({
    lockId: one[0].id, kind: 'random', type: 'cycle_weekday', name: '云脉智能-保洁-上午班', code: '271635',
    startAt: '2026-02-10T08:00:00', endAt: '2026-12-31T12:00:00', purpose: 'cleaning',
    companyId: STORY_COMPANY_IDS.one, disabledAt: daysAgo(3, '17:05'),
  })
  addPasscode({
    lockId: one[1].id, kind: 'random', type: 'period', name: '云脉智能-员工-陈默', code: '664208',
    startAt: '2026-01-10T00:00:00', endAt: '2026-12-31T23:59:00', purpose: 'staff', companyId: STORY_COMPANY_IDS.one,
  })
  addPasscode({
    lockId: one[1].id, kind: 'random', type: 'period', name: '云脉智能-访客-李女士', code: '090317',
    startAt: daysAgo(12, '09:00'), endAt: daysAgo(10, '18:00'), purpose: 'visitor',
    companyId: STORY_COMPANY_IDS.one, createdAt: daysAgo(12, '08:40'),
  })

  addPasscode({
    lockId: two[0].id, kind: 'custom', type: 'permanent', name: '精工精密-前台-通用', code: '520331',
    startAt: '2025-08-15T09:00:00', purpose: 'staff', companyId: STORY_COMPANY_IDS.two,
  })
  addPasscode({
    lockId: two[1].id, kind: 'random', type: 'period', name: '精工精密-车间-早班组', code: '118246',
    startAt: '2026-03-01T00:00:00', endAt: '2026-09-30T23:59:00', purpose: 'staff', companyId: STORY_COMPANY_IDS.two,
  })

  addPasscode({
    lockId: three[0].id, kind: 'custom', type: 'permanent', name: '洄澜餐饮-店长-通用', code: '937501',
    startAt: '2025-10-01T09:00:00', purpose: 'staff', companyId: STORY_COMPANY_IDS.three,
  })
  addPasscode({
    lockId: three[0].id, kind: 'random', type: 'cycle_daily', name: '洄澜餐饮-供货商-配送', code: '355872',
    startAt: '2026-03-01T06:00:00', endAt: '2026-12-31T09:00:00', purpose: 'other', companyId: STORY_COMPANY_IDS.three,
  })

  // 物业发的保洁循环密码(大门锁,不挂企业)
  for (const [buildingId, csName] of [
    ['A4', '王琳'],
    ['B2', '王琳'],
    ['C1', '刘洋'],
  ] as const) {
    const gate = gateByBuilding.get(buildingId)!
    addPasscode({
      lockId: gate.id, kind: 'random', type: 'cycle_weekday',
      name: `物业-保洁-${gate.zoneId} 区班组`, code: String(randInt(rng, 100000, 999999)),
      startAt: '2026-01-05T07:00:00', endAt: '2026-12-31T10:00:00', purpose: 'cleaning',
      createdBy: csName, createdByRole: 'property',
    })
  }

  // filler:部分企业 1 个员工通用密码
  for (const cid of ['C-01', 'C-04', 'C-10', 'C-12', 'C-17', 'C-22', 'C-24', 'C-26']) {
    const locks = companyLocks.get(cid)
    const company = companyById.get(cid)
    if (!locks?.length || !company) continue
    addPasscode({
      lockId: locks[0].id, kind: 'random', type: 'period', name: `${company.name}-员工-通用`,
      code: String(randInt(rng, 100000, 999999)),
      startAt: '2026-01-15T00:00:00', endAt: '2026-12-31T23:59:00', purpose: 'staff', companyId: cid,
    })
  }

  // ===== 4. 通行记录(近 30 天故事锁 / 近 7 天其余;时间升序后统一编号)=====
  const passcodeNamesByLock = new Map<string, string[]>()
  for (const p of lockPasscodes) {
    if (p.deletedAt) continue
    passcodeNamesByLock.set(p.lockId, [...(passcodeNamesByLock.get(p.lockId) ?? []), p.name])
  }

  const actorFor = (method: UnlockMethod, lockId: string, company?: Company): string => {
    if (method === 'passcode') {
      const names = passcodeNamesByLock.get(lockId)
      if (names?.length) return pick(rng, names)
      return company ? `${company.name}-员工密码` : '保洁密码'
    }
    if (method === 'ic_card') return company ? `${company.name}-门禁卡` : '物业门禁卡'
    if (method === 'remote') return company?.contactName ?? '物业客服'
    return company?.contactName ?? '物业人员'
  }

  const pushRecords = (lock: DoorLock, company: Company | undefined, days: number, weekdayMax: number) => {
    for (let d = days; d >= 1; d--) {
      const date = dateDaysAgo(d)
      const dow = new Date(`${date}T12:00:00`).getDay()
      const weekend = dow === 0 || dow === 6
      const n = weekend ? randInt(rng, 0, Math.max(1, Math.floor(weekdayMax / 4))) : randInt(rng, 2, weekdayMax)
      for (let i = 0; i < n; i++) {
        const method = pickMethod(rng)
        const failed = rng() < 0.015
        rawRecords.push({
          lockId: lock.id,
          at: `${date}T${String(randInt(rng, 7, 20)).padStart(2, '0')}:${String(randInt(rng, 0, 59)).padStart(2, '0')}:${String(randInt(rng, 0, 59)).padStart(2, '0')}`,
          method: failed ? 'passcode' : method,
          success: !failed,
          actorLabel: failed ? '密码输入错误' : actorFor(method, lock.id, company),
          companyId: company?.id,
        })
      }
    }
  }

  for (const company of companies) {
    const locks = companyLocks.get(company.id) ?? []
    const story = storyIds.has(company.id)
    for (const lock of locks) pushRecords(lock, company, story ? 30 : 7, story ? 10 : 5)
  }
  for (const gate of gateByBuilding.values()) pushRecords(gate, undefined, 7, 9)
  for (const lock of publicLocks) pushRecords(lock, undefined, 7, 2)

  // 故事:6/5 晚洄澜餐饮门口连续 3 次密码失败(异常识别素材)
  for (const time of ['22:41:12', '22:42:47', '22:44:03']) {
    rawRecords.push({
      lockId: three[0].id,
      at: `${dateDaysAgo(1)}T${time}`,
      method: 'passcode',
      success: false,
      actorLabel: '密码输入错误',
      companyId: STORY_COMPANY_IDS.three,
    })
  }

  // 今天(周六)上午的通行,支撑「今日开锁」KPI 与两端列表首屏
  const todayDefs: { lock: DoorLock; company?: Company; time: string; method: UnlockMethod; actor: string }[] = [
    { lock: three[0], company: companyById.get(STORY_COMPANY_IDS.three), time: '07:52:10', method: 'passcode', actor: '洄澜餐饮-店长-通用' },
    { lock: three[0], company: companyById.get(STORY_COMPANY_IDS.three), time: '08:11:36', method: 'passcode', actor: '洄澜餐饮-供货商-配送' },
    { lock: gateByBuilding.get('C1')!, time: '07:58:22', method: 'passcode', actor: '物业-保洁-C 区班组' },
    { lock: one[0], company: companyById.get(STORY_COMPANY_IDS.one), time: '09:05:44', method: 'app_ble', actor: '' },
    { lock: one[0], company: companyById.get(STORY_COMPANY_IDS.one), time: '09:12:03', method: 'passcode', actor: '云脉智能-访客-张先生' },
    { lock: one[1], company: companyById.get(STORY_COMPANY_IDS.one), time: '09:47:29', method: 'passcode', actor: '云脉智能-员工-陈默' },
    { lock: two[0], company: companyById.get(STORY_COMPANY_IDS.two), time: '08:32:51', method: 'ic_card', actor: '' },
    { lock: gateByBuilding.get('A3')!, time: '08:58:40', method: 'app_ble', actor: '' },
  ]
  for (const def of todayDefs) {
    rawRecords.push({
      lockId: def.lock.id,
      at: `${dateDaysAgo(0)}T${def.time}`,
      method: def.method,
      success: true,
      actorLabel: def.actor || actorFor(def.method, def.lock.id, def.company),
      companyId: def.company?.id,
    })
  }

  const unlockRecords: UnlockRecord[] = rawRecords
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((r, i) => ({ ...r, id: `UR-${String(i + 1).padStart(5, '0')}` }))

  // ===== 5. 客服门锁管辖(与企业管辖同分区口径)=====
  const csLockAssignments: CsLockAssignment[] = Object.entries(DEFAULT_CS_ZONES).map(([csUsername, zoneIds]) => ({
    csUsername,
    lockIds: doorLocks.filter((l) => zoneIds.includes(l.zoneId)).map((l) => l.id),
  }))

  return { doorLocks, lockAssignments, lockPasscodes, unlockRecords, csLockAssignments }
}
