import { addHours, compactDate, daysAgo, lastMonths, monthDay } from '../../lib/date'
import { formatDateTime } from '../../lib/format'
import { pick, randInt, type Rng } from '../../lib/prng'
import { PARKING_FEE, PROPERTY_FEE_RATE } from '../constants'
import type {
  Bill,
  Building,
  Community,
  Complaint,
  DeptCode,
  Household,
  ServiceTask,
  Unit,
  WorkOrder,
  WorkOrderCategory,
} from '../types'
import {
  COMPLAINT_CONTENTS,
  COMPLAINT_REPLIES,
  COMMUNITY_DEFS,
  COMPLETION_NOTES,
  GIVEN_NAMES,
  RATING_COMMENTS,
  STAFF,
  SURNAMES,
  WO_DESCRIPTIONS,
} from './constants'
import { STORY_OWNER_NAMES, type PayProfile } from './storyHouseholds'

// ============================================================
// 批量生成 filler 数据:空间结构、12 个月账单、工单、投诉。
// 全部使用固定种子 rng,保证每次构建结果一致。
// ============================================================

function genName(rng: Rng): string {
  let name = pick(rng, SURNAMES) + pick(rng, GIVEN_NAMES)
  while (STORY_OWNER_NAMES.has(name)) name = pick(rng, SURNAMES) + pick(rng, GIVEN_NAMES)
  return name
}

function genPhone(rng: Rng): string {
  return `1${pick(rng, ['3', '5', '7', '8', '9'])}${String(randInt(rng, 0, 999999999)).padStart(9, '0')}`
}

function randTime(rng: Rng): string {
  return `${String(randInt(rng, 8, 18)).padStart(2, '0')}:${String(randInt(rng, 0, 59)).padStart(2, '0')}`
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ===== 空间结构 =====

export interface SpacesResult {
  communities: Community[]
  buildings: Building[]
  units: Unit[]
  households: Household[]
  /** 户 → 是否有车位(决定是否产生车位费账单) */
  parkingMap: Map<string, boolean>
}

export function genSpaces(rng: Rng): SpacesResult {
  const communities: Community[] = []
  const buildings: Building[] = []
  const units: Unit[] = []
  const households: Household[] = []
  const parkingMap = new Map<string, boolean>()

  for (const def of COMMUNITY_DEFS) {
    communities.push({ id: def.id, name: def.name })
    for (let b = 1; b <= def.buildings; b++) {
      const buildingId = `${def.id}-${b}`
      buildings.push({ id: buildingId, communityId: def.id, no: `${b}栋` })
      for (let u = 1; u <= def.unitsPerBuilding; u++) {
        const unitId = `${buildingId}-${u}`
        units.push({ id: unitId, buildingId, communityId: def.id, no: `${u}单元` })
        const floors = def.householdsPerUnit / 2
        for (let f = 1; f <= floors; f++) {
          for (let r = 1; r <= 2; r++) {
            const roomNo = `${f}0${r}`
            const id = `${unitId}-${roomNo.padStart(4, '0')}`
            households.push({
              id,
              householdNo: `${def.name}${b}栋${u}单元${roomNo}`,
              roomNo,
              communityId: def.id,
              buildingId,
              unitId,
              ownerName: genName(rng),
              ownerPhone: genPhone(rng),
              areaSqm: 2 * randInt(rng, 38, 70), // 76 ~ 140 ㎡(偶数,保证物业费为整数)
              isVacant: false,
              anomaly: null,
            })
            parkingMap.set(id, rng() < 0.3)
          }
        }
      }
    }
  }
  return { communities, buildings, units, households, parkingMap }
}

/** 随机挑 count 个非故事户登记为空置(已正常缴半价,丰富空置率指标) */
export function markFillerVacants(households: Household[], rng: Rng, storyIds: Set<string>, count = 3): void {
  const candidates = shuffle(households.filter((h) => !storyIds.has(h.id)), rng).slice(0, count)
  const sinceOptions = ['2025-09', '2025-12', '2026-02']
  candidates.forEach((h, i) => {
    h.isVacant = true
    h.vacantSince = sinceOptions[i % sinceOptions.length]
  })
}

// ===== 缴费画像 =====

export interface ProfilesResult {
  profiles: Map<string, PayProfile>
  /** 被指定为欠费的 filler 户(开放工单/投诉要避开它们,保持催缴列表叙事纯净) */
  arrearsFillerIds: Set<string>
}

export function buildProfiles(
  households: Household[],
  rng: Rng,
  storyProfiles: Map<string, PayProfile>,
  storyIds: Set<string>,
): ProfilesResult {
  const profiles = new Map<string, PayProfile>(storyProfiles)
  const arrearsFillerIds = new Set<string>()

  const candidates = shuffle(
    households.filter((h) => !storyIds.has(h.id) && !h.isVacant),
    rng,
  )
  const months = lastMonths(2)

  // 5 户当月新欠、4 户连欠两月、3 户当月部分缴纳 → 当月收缴率压到 87% 左右(低于 90% 目标线)
  const juneUnpaid = candidates.slice(0, 5)
  const twoMonth = candidates.slice(5, 9)
  const partial = candidates.slice(9, 12)

  for (const h of juneUnpaid) {
    profiles.set(h.id, { unpaidMonths: [months[1]], partialMonths: [] })
    arrearsFillerIds.add(h.id)
  }
  for (const h of twoMonth) {
    profiles.set(h.id, { unpaidMonths: [...months], partialMonths: [] })
    arrearsFillerIds.add(h.id)
  }
  for (const h of partial) {
    profiles.set(h.id, { unpaidMonths: [], partialMonths: [months[1]] })
    arrearsFillerIds.add(h.id)
  }
  return { profiles, arrearsFillerIds }
}

// ===== 账单 =====

export function genBills(
  households: Household[],
  profiles: Map<string, PayProfile>,
  parkingMap: Map<string, boolean>,
  rng: Rng,
): Bill[] {
  const months = lastMonths(12)
  const bills: Bill[] = []

  for (const h of households) {
    const profile = profiles.get(h.id) ?? { unpaidMonths: [], partialMonths: [] }
    // 疑似空置户:长期无水电用量(无水电账单),物业费仍按全额计 —— 「假欠费」的来源
    const noUtilities = h.anomaly === 'suspected_vacant'

    for (const month of months) {
      const vacantThisMonth = h.isVacant && h.vacantSince != null && month >= h.vacantSince
      const unpaid = profile.unpaidMonths.includes(month)
      const partialThisMonth = profile.partialMonths.includes(month)
      const paidAt = monthDay(month, randInt(rng, 5, 18), randTime(rng))

      const pushBill = (feeType: Bill['feeType'], amount: number, isHalfPrice = false) => {
        const paidAmount = unpaid ? 0 : partialThisMonth && feeType === 'property' ? Math.round(amount / 2) : amount
        bills.push({
          id: `B-${h.id}-${month}-${feeType}`,
          householdId: h.id,
          feeType,
          month,
          amount,
          paidAmount,
          paidAt: paidAmount > 0 ? paidAt : undefined,
          isHalfPrice,
        })
      }

      const baseFee = Math.round(h.areaSqm * PROPERTY_FEE_RATE)
      if (vacantThisMonth) {
        pushBill('property', Math.round(baseFee / 2), true) // 空置半价
      } else {
        pushBill('property', baseFee)
      }
      if (!noUtilities && !vacantThisMonth) {
        pushBill('water', randInt(rng, 28, 75))
        pushBill('electricity', randInt(rng, 80, 260))
        if (parkingMap.get(h.id)) pushBill('parking', PARKING_FEE)
      }
    }
  }
  return bills
}

// ===== 工单事件链构造 =====

type WoFlow = 'pending' | 'accepted' | 'dispatched' | 'in_progress' | 'done_pending_sign' | 'closed'

interface WoSpec {
  household: Household
  category: WorkOrderCategory
  reported: string
  flow: WoFlow
  /** 完工耗时超 SLA(计入及时率分母的「迟到完工」样本) */
  lateCompletion?: boolean
  rating?: 1 | 2 | 3 | 4 | 5
}

const ENGINEERS = STAFF.filter((s) => s.dept === 'engineering' && s.role === 'staff')

function buildWo(spec: WoSpec, rng: Rng): WorkOrder {
  const { household, category, reported, flow } = spec
  const description = pick(rng, WO_DESCRIPTIONS[category])
  const wo: WorkOrder = {
    id: '',
    householdId: household.id,
    category,
    description,
    events: [{ type: 'REPORTED', at: reported, by: household.ownerName, note: description }],
  }
  if (flow === 'pending') return wo

  const acceptedAt = addHours(reported, randInt(rng, 1, 4))
  wo.events.push({ type: 'ACCEPTED', at: acceptedAt, by: '李婷', note: '客服确认受理' })
  if (flow === 'accepted') return wo

  const staff = pick(rng, ENGINEERS)
  const dispatchedAt = addHours(acceptedAt, randInt(rng, 1, 5))
  wo.events.push({ type: 'DISPATCHED', at: dispatchedAt, by: '王建军', note: `派单至工程部 ${staff.name}` })
  wo.assignedDept = 'engineering'
  wo.assignedStaffId = staff.id
  if (flow === 'dispatched') return wo

  const appointmentAt = addHours(dispatchedAt, randInt(rng, 16, 24))
  wo.events.push({
    type: 'APPOINTMENT_SET',
    at: addHours(dispatchedAt, randInt(rng, 1, 3)),
    by: staff.name,
    note: `预约上门时间 ${formatDateTime(appointmentAt)}`,
  })
  wo.appointmentAt = appointmentAt
  if (flow === 'in_progress') return wo

  const completedAt = spec.lateCompletion
    ? addHours(reported, randInt(rng, 56, 75)) // 迟到完工:56~75 小时
    : addHours(appointmentAt, randInt(rng, 1, 5)) // 按时完工:约 20~38 小时
  const completionNote = pick(rng, COMPLETION_NOTES)
  wo.events.push({ type: 'COMPLETED', at: completedAt, by: staff.name, note: completionNote })
  wo.completionNote = completionNote
  if (flow === 'done_pending_sign') return wo

  const signedAt = addHours(completedAt, randInt(rng, 2, 20))
  wo.events.push({ type: 'SIGNED', at: signedAt, by: household.ownerName, note: '业主签字确认' })
  wo.events.push({ type: 'CLOSED', at: addHours(signedAt, 0.02), by: '系统', note: '签字完成,自动关单' })

  if (spec.rating) {
    wo.satisfactionRating = spec.rating
    wo.ratingComment = spec.rating >= 3 ? pick(rng, RATING_COMMENTS) : '处理太慢,体验不好'
    wo.events.push({ type: 'RATED', at: addHours(signedAt, randInt(rng, 1, 4)), by: household.ownerName, note: wo.ratingComment })
  }
  return wo
}

const CATEGORIES: WorkOrderCategory[] = ['plumbing', 'electrical', 'door_window', 'public_area', 'other']
const RATING_POOL: (1 | 2 | 3 | 4 | 5)[] = [5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2]

/**
 * 生成 filler 工单:
 * - 20 单已关(其中 2 单迟到完工,~85% 已评价)
 * - 待接单×2、已派单×2、处理中×2、待签字×2(均在 SLA 内)
 * - 超时未完工×2(只挂到缴费正常的户,避免污染催缴叙事)
 */
export function genFillerWorkOrders(
  households: Household[],
  rng: Rng,
  storyIds: Set<string>,
  arrearsFillerIds: Set<string>,
): WorkOrder[] {
  const anyPool = households.filter((h) => !storyIds.has(h.id) && !h.isVacant)
  const safePool = shuffle(anyPool.filter((h) => !arrearsFillerIds.has(h.id)), rng)
  const wos: WorkOrder[] = []

  for (let i = 0; i < 20; i++) {
    wos.push(
      buildWo(
        {
          household: pick(rng, anyPool),
          category: pick(rng, CATEGORIES),
          reported: daysAgo(randInt(rng, 6, 70), randTime(rng)),
          flow: 'closed',
          lateCompletion: i < 2,
          rating: rng() < 0.85 ? pick(rng, RATING_POOL) : undefined,
        },
        rng,
      ),
    )
  }

  const openSpecs: { flow: WoFlow; reportedDaysAgo: number; time: string }[] = [
    { flow: 'pending', reportedDaysAgo: 0, time: '09:15' },
    { flow: 'pending', reportedDaysAgo: 1, time: '16:40' },
    { flow: 'dispatched', reportedDaysAgo: 1, time: '10:20' },
    { flow: 'dispatched', reportedDaysAgo: 1, time: '14:05' },
    { flow: 'in_progress', reportedDaysAgo: 1, time: '08:50' },
    { flow: 'in_progress', reportedDaysAgo: 1, time: '11:30' },
    { flow: 'done_pending_sign', reportedDaysAgo: 2, time: '09:40' },
    { flow: 'done_pending_sign', reportedDaysAgo: 2, time: '15:10' },
  ]
  openSpecs.forEach((s, i) => {
    wos.push(
      buildWo(
        {
          household: safePool[i % safePool.length],
          category: pick(rng, CATEGORIES),
          reported: daysAgo(s.reportedDaysAgo, s.time),
          flow: s.flow,
        },
        rng,
      ),
    )
  })

  // 超时未完工 ×2(报修 3~4 天前,已派单未完工)
  wos.push(
    buildWo(
      { household: safePool[10], category: 'public_area', reported: daysAgo(4, '11:20'), flow: 'dispatched' },
      rng,
    ),
  )
  wos.push(
    buildWo(
      { household: safePool[11], category: 'plumbing', reported: daysAgo(3, '09:50'), flow: 'in_progress' },
      rng,
    ),
  )
  return wos
}

// ===== filler 投诉 =====

const DEPT_SUPERVISOR: Partial<Record<DeptCode, string>> = {
  engineering: '王建军',
  customer_service: '周晓燕',
  security: '赵海峰',
  cleaning: '孙桂芳',
}

export function genFillerComplaints(
  households: Household[],
  rng: Rng,
  storyIds: Set<string>,
  arrearsFillerIds: Set<string>,
): Complaint[] {
  const anyPool = households.filter((h) => !storyIds.has(h.id) && !h.isVacant)
  const safePool = shuffle(anyPool.filter((h) => !arrearsFillerIds.has(h.id)), rng)
  const complaints: Complaint[] = []
  const depts: DeptCode[] = ['cleaning', 'security', 'engineering']

  // 已关闭 ×3(其中 1 条走过主管介入全链)
  for (let i = 0; i < 3; i++) {
    const h = pick(rng, anyPool)
    const dept = depts[i]
    const supervisor = DEPT_SUPERVISOR[dept] ?? '周晓燕'
    const content = pick(rng, COMPLAINT_CONTENTS)
    const createdAt = daysAgo(randInt(rng, 12, 50), randTime(rng))
    const dispatchedAt = addHours(createdAt, randInt(rng, 1, 4))
    const repliedAt = addHours(dispatchedAt, randInt(rng, 12, 30))
    const c: Complaint = {
      id: '',
      householdId: h.id,
      content,
      events: [
        { type: 'CREATED', at: createdAt, by: h.ownerName, content },
        { type: 'DISPATCHED', at: dispatchedAt, by: '周晓燕', dept, content: '已转责任部门处理' },
        { type: 'REPLIED', at: repliedAt, by: supervisor, content: pick(rng, COMPLAINT_REPLIES) },
      ],
      responsibleDept: dept,
    }
    if (i === 0) {
      const reqAt = addHours(repliedAt, randInt(rng, 3, 8))
      const supRepliedAt = addHours(reqAt, randInt(rng, 12, 24))
      c.events.push(
        { type: 'SUPERVISOR_REQUESTED', at: reqAt, by: h.ownerName, content: '对处理结果不满意,申请主管介入' },
        { type: 'SUPERVISOR_REPLIED', at: supRepliedAt, by: '周晓燕', content: '已现场复核并落实整改,后续由客服专员每周回访跟进,向您致歉' },
        { type: 'CLOSED', at: addHours(supRepliedAt, randInt(rng, 6, 20)), by: h.ownerName, content: '业主确认解决,关闭投诉' },
      )
    } else {
      c.events.push({ type: 'CLOSED', at: addHours(repliedAt, randInt(rng, 6, 24)), by: h.ownerName, content: '业主确认解决,关闭投诉' })
    }
    complaints.push(c)
  }

  // 已回复待业主确认 ×1(开放投诉,避开欠费 filler 户)
  {
    const h = safePool[20]
    const content = pick(rng, COMPLAINT_CONTENTS)
    const createdAt = daysAgo(3, '10:40')
    const dispatchedAt = addHours(createdAt, 2)
    complaints.push({
      id: '',
      householdId: h.id,
      content,
      events: [
        { type: 'CREATED', at: createdAt, by: h.ownerName, content },
        { type: 'DISPATCHED', at: dispatchedAt, by: '周晓燕', dept: 'security', content: '已转秩序部处理' },
        { type: 'REPLIED', at: addHours(dispatchedAt, 20), by: '赵海峰', content: pick(rng, COMPLAINT_REPLIES) },
      ],
      responsibleDept: 'security',
    })
  }

  // 今晨新投诉,待处理 ×1
  {
    const h = safePool[21]
    const content = pick(rng, COMPLAINT_CONTENTS)
    complaints.push({
      id: '',
      householdId: h.id,
      content,
      events: [{ type: 'CREATED', at: daysAgo(0, '09:05'), by: h.ownerName, content }],
    })
  }

  return complaints
}

// ===== ID 分配与空置待办 =====

/** 工单按报修时间排序并按日期编号:WO-20260601-001 */
export function assignWorkOrderIds(wos: WorkOrder[]): WorkOrder[] {
  const sorted = [...wos].sort((a, b) => a.events[0].at.localeCompare(b.events[0].at))
  const counters = new Map<string, number>()
  for (const wo of sorted) {
    const date = compactDate(wo.events[0].at)
    const seq = (counters.get(date) ?? 0) + 1
    counters.set(date, seq)
    wo.id = `WO-${date}-${String(seq).padStart(3, '0')}`
  }
  return sorted
}

/** 投诉按创建时间排序编号:CP-001 */
export function assignComplaintIds(complaints: Complaint[]): Complaint[] {
  const sorted = [...complaints].sort((a, b) => a.events[0].at.localeCompare(b.events[0].at))
  sorted.forEach((c, i) => {
    c.id = `CP-${String(i + 1).padStart(3, '0')}`
  })
  return sorted
}

/** 为每个已登记空置的户生成一条「已停水停电」的完成待办 */
export function buildServiceTasks(households: Household[]): ServiceTask[] {
  const tasks = households
    .filter((h) => h.isVacant && h.vacantSince)
    .map((h) => ({
      householdId: h.id,
      type: 'CUT_UTILITIES' as const,
      note: '住户登记空置,已停水停电并记录水电表底数',
      status: 'done' as const,
      createdAt: monthDay(h.vacantSince!, 1, '10:30'),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return tasks.map((t, i) => ({ ...t, id: `ST-${String(i + 1).padStart(3, '0')}` }))
}
