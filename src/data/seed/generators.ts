import { addHours, compactDate, daysAgo, lastMonths, monthDay } from '../../lib/date'
import { formatDateTime } from '../../lib/format'
import { pick, randInt, type Rng } from '../../lib/prng'
import { FIXED_PARKING_FEE, LEASED_PARKING_FEE, PROPERTY_FEE_RATE } from '../constants'
import type {
  Bill,
  Company,
  Complaint,
  CsAssignment,
  DeptCode,
  FeeCategory,
  Inspection,
  Invoice,
  MaintenanceOrder,
  MeterReading,
  RevenueTarget,
  Survey,
  SurveyResponse,
  ValueAddedContract,
  Waiver,
  WorkOrder,
  WorkOrderCategory,
  WorkTask,
} from '../types'
import {
  BUILDINGS,
  COMPANY_DEFS,
  COMPLAINT_CONTENTS,
  COMPLAINT_REPLIES,
  COMPLETION_NOTES,
  CONTACT_GIVEN_NAMES,
  CONTACT_SURNAMES,
  DEFAULT_CS_ZONES,
  INSPECTION_AREAS,
  INSPECTION_TEMPLATES,
  PUBLIC_WO_LOCATIONS,
  RATING_COMMENTS_BAD,
  RATING_COMMENTS_GOOD,
  STAFF,
  SURVEY_QUESTIONS,
  TARGET_K_RANGE,
  VA_CONTRACT_DEFS,
  WO_DESCRIPTIONS,
  YEAR_TASK_DEFS,
  type CompanyDef,
} from './constants'

// ============================================================
// 批量生成数据:企业、12 个月四费类账单、目标、两类工单、投诉、
// 维保、巡检、核抄(24 个月)、任务树、调研、发票。
// 全部使用固定种子 rng,保证每次构建结果一致。
// ============================================================

export function genContactName(rng: Rng): string {
  return pick(rng, CONTACT_SURNAMES) + pick(rng, CONTACT_GIVEN_NAMES)
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

const buildingById = new Map(BUILDINGS.map((b) => [b.id, b]))

/** 该企业所属区的客服显示名(接单/上传发票等操作人语义) */
export function zoneCsName(zoneId: string): string {
  return zoneId === 'C' ? '刘洋' : '王琳'
}

// ===== 企业与车位 =====

export function buildCompanies(rng: Rng): Company[] {
  return COMPANY_DEFS.map((def) => {
    const building = buildingById.get(def.buildingId)
    if (!building) throw new Error(`未知楼栋 ${def.buildingId}`)
    const startYear = randInt(rng, 2022, 2025)
    const startMonth = randInt(rng, 1, 12)
    const years = randInt(rng, 3, 6)
    return {
      id: def.id,
      name: def.name,
      industry: def.industry,
      zoneId: building.zoneId,
      buildingId: def.buildingId,
      occupancy: def.floors
        ? { type: 'partial', floors: def.floors, unitLabel: def.unitLabel ?? `${def.floors.join('、')} 层` }
        : { type: 'whole' },
      areaSqm: def.areaSqm,
      contactName: genContactName(rng),
      contactPhone: genPhone(rng),
      contractStart: `${startYear}-${String(startMonth).padStart(2, '0')}`,
      contractEnd: `${startYear + years}-${String(startMonth).padStart(2, '0')}`,
      paymentHabit: def.habit,
    }
  })
}

export interface ParkingPlan {
  fixed: number
  leased: number
}

export function buildParkingPlans(rng: Rng): Map<string, ParkingPlan> {
  const plans = new Map<string, ParkingPlan>()
  for (const def of COMPANY_DEFS) {
    const whole = !def.floors
    const fixed = whole ? randInt(rng, 15, 35) : randInt(rng, 3, 10)
    const leased = rng() < 0.25 ? randInt(rng, 4, 12) : 0
    plans.set(def.id, { fixed, leased })
  }
  return plans
}

/** 默认客服分配:按区划分,30 家企业全部有归属客服 */
export function buildCsAssignments(companies: Company[]): CsAssignment[] {
  return Object.entries(DEFAULT_CS_ZONES).map(([csUsername, zoneIds]) => ({
    csUsername,
    companyIds: companies.filter((c) => zoneIds.includes(c.zoneId)).map((c) => c.id),
  }))
}

export function buildVaContracts(): ValueAddedContract[] {
  return VA_CONTRACT_DEFS.map((d) => ({ ...d }))
}

// ===== 账单(12 个月 × 四费类)=====

/** 行业能耗系数(制造/餐饮/健身耗能更高) */
function utilityFactor(industry: string): number {
  if (/制造|加工|模具|仓储|物流|光电|半导体|装备/.test(industry)) return 1.3
  if (/餐饮|健身|商超|便利/.test(industry)) return 1.25
  return 1
}

function isSummer(month: string): boolean {
  const m = Number(month.slice(5))
  return m >= 6 && m <= 9
}

export interface BillsResult {
  bills: Bill[]
  monthsCovered: string[]
}

/**
 * 生成账单:
 * - 物业费 = 面积 × 18 元/㎡·月;水电按面积与行业系数;车位按 parkingPlans;增值按合同。
 * - 缴费画像见 CompanyDef.arrears;paidAt 落在该企业习惯付款日(与缴费习惯叙事一致)。
 * - 减免(waivers)从对应月份费类账单的 amount 中直接扣减(账单存净额,减免单独聚合)。
 * - 园区级临时停放收入 companyId 为空;当月按 6 天实际入账。
 */
export function genBills(
  companies: Company[],
  parkingPlans: Map<string, ParkingPlan>,
  contracts: ValueAddedContract[],
  waivers: Waiver[],
  rng: Rng,
): BillsResult {
  const months = lastMonths(12)
  const currentMonth = months[months.length - 1]
  const bills: Bill[] = []
  const defById = new Map(COMPANY_DEFS.map((d) => [d.id, d]))

  const waiverFor = (companyId: string, month: string, category: FeeCategory): number =>
    waivers
      .filter((w) => w.companyId === companyId && w.month === month && w.category === category)
      .reduce((s, w) => s + w.amount, 0)

  for (const company of companies) {
    const def = defById.get(company.id) as CompanyDef
    const plan = parkingPlans.get(company.id) ?? { fixed: 0, leased: 0 }
    const factor = utilityFactor(company.industry)
    const payDay = company.paymentHabit?.payDay ?? randInt(rng, 3, 8)

    /** 该月是否未缴(按欠费画像) */
    const unpaidThisMonth = (month: string, category: FeeCategory, subType?: string): boolean => {
      if (!def.arrears) return false
      const mIdx = months.indexOf(month)
      const last = months.length - 1
      switch (def.arrears) {
        case 'currentMonth':
          return mIdx === last
        case 'story3':
          return mIdx >= last - 1
        case 'pastTwoMonths':
          return mIdx === last - 1 || mIdx === last - 2
        case 'story2':
          // 故事②:当月仅物业费与电费未缴(对账争议),其余照缴
          return mIdx === last && (category === 'property' || (category === 'utility' && subType === 'electricity'))
      }
    }

    for (const month of months) {
      const paidAtBase = def.paysToday && month === currentMonth
        ? `${currentMonth}-06T09:12:00`
        : monthDay(month, Math.min(payDay, 28), randTime(rng))

      const pushBill = (category: FeeCategory, subType: Bill['subType'], gross: number, contractId?: string) => {
        const amount = gross - waiverFor(company.id, month, category)
        if (amount <= 0) return
        const unpaid = unpaidThisMonth(month, category, subType)
        bills.push({
          id: `B-${company.id}-${month}-${category}${subType ? `-${subType}` : ''}${contractId ? `-${contractId}` : ''}`,
          companyId: company.id,
          category,
          subType,
          month,
          amount,
          paidAmount: unpaid ? 0 : amount,
          paidAt: unpaid ? undefined : paidAtBase,
          contractId,
        })
      }

      // 物业服务费
      pushBill('property', undefined, company.areaSqm * PROPERTY_FEE_RATE)
      // 水电能耗费(购水/购电)
      const elec = Math.round(company.areaSqm * factor * (2.4 + rng() * 0.8) * (isSummer(month) ? 1.15 : 1))
      const water = Math.round(company.areaSqm * factor * (0.38 + rng() * 0.18))
      pushBill('utility', 'electricity', elec)
      pushBill('utility', 'water', water)
      // 车辆服务费(固定/租赁车位)
      if (plan.fixed > 0) pushBill('vehicle', 'fixed', plan.fixed * FIXED_PARKING_FEE)
      if (plan.leased > 0) pushBill('vehicle', 'leased', plan.leased * LEASED_PARKING_FEE)
      // 增值服务费(按合同)
      for (const contract of contracts) {
        if (contract.companyId !== company.id) continue
        if (month < contract.start || month > contract.end) continue
        pushBill('valueAdded', contract.type, contract.monthlyAmount, contract.id)
      }
    }
  }

  // 园区级临时停放收入(不挂企业;当月按 6 天实际入账,历史月足额)
  for (const month of months) {
    const isCurrent = month === currentMonth
    const amount = isCurrent ? 6800 : randInt(rng, 25000, 35000)
    bills.push({
      id: `B-PARK-${month}-vehicle-temporary`,
      category: 'vehicle',
      subType: 'temporary',
      month,
      amount,
      paidAmount: amount,
      paidAt: isCurrent ? `${month}-06T08:30:00` : monthDay(month, 28, '17:30'),
    })
  }

  return { bills, monthsCovered: months }
}

// ===== 收费目标(费类 × 月;目标 = 应收 × k,取整到百元)=====

export function genTargets(bills: Bill[], rng: Rng): RevenueTarget[] {
  const months = lastMonths(12)
  const categories: FeeCategory[] = ['property', 'vehicle', 'utility', 'valueAdded']
  const targets: RevenueTarget[] = []
  for (const month of months) {
    for (const category of categories) {
      const receivable = bills
        .filter((b) => b.month === month && b.category === category)
        .reduce((s, b) => s + b.amount, 0)
      const [lo, hi] = TARGET_K_RANGE[category]
      const k = lo + rng() * (hi - lo)
      targets.push({ category, month, amount: Math.round((receivable * k) / 100) * 100 })
    }
  }
  return targets
}

// ===== 工单事件链构造 =====

type WoFlow = 'pending' | 'accepted' | 'dispatched' | 'in_progress' | 'done_pending_sign' | 'closed'

export interface WoSpec {
  company?: Company
  location?: { zoneId?: string; buildingId?: string; label: string }
  category: WorkOrderCategory
  reported: string
  flow: WoFlow
  /** 完工耗时超 SLA(计入及时率分母的「迟到完工」样本) */
  lateCompletion?: boolean
  /** 接单响应超时(>4h,压低响应及时率) */
  slowResponse?: boolean
  rating?: 1 | 2 | 3 | 4 | 5
  description?: string
}

const ENGINEERS = STAFF.filter((s) => s.dept === 'engineering' && s.role === 'staff')

export function buildWo(spec: WoSpec, rng: Rng): WorkOrder {
  const { company, location, category, reported, flow } = spec
  const kind = company ? 'company' : 'public'
  const description = spec.description ?? pick(rng, WO_DESCRIPTIONS[category])
  const reporter = company ? company.contactName : '物业巡检'
  const acceptor = company ? zoneCsName(company.zoneId) : '周晓燕'

  const wo: WorkOrder = {
    id: '',
    kind,
    companyId: company?.id,
    location: company ? undefined : location,
    category,
    description,
    events: [
      {
        type: 'REPORTED',
        at: reported,
        by: reporter,
        note: kind === 'public' ? `巡检发现:${description}` : description,
      },
    ],
  }
  if (flow === 'pending') return wo

  const acceptedAt = addHours(reported, spec.slowResponse ? randInt(rng, 6, 10) : randInt(rng, 1, 3))
  wo.events.push({ type: 'ACCEPTED', at: acceptedAt, by: acceptor, note: '物业确认受理' })
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
    note: `预约处理时间 ${formatDateTime(appointmentAt)}`,
  })
  wo.appointmentAt = appointmentAt
  if (flow === 'in_progress') return wo

  const completedAt = spec.lateCompletion
    ? addHours(reported, randInt(rng, 56, 75)) // 迟到完工:56~75 小时
    : addHours(appointmentAt, randInt(rng, 1, 5)) // 按时完工
  const completionNote = pick(rng, COMPLETION_NOTES)
  wo.events.push({ type: 'COMPLETED', at: completedAt, by: staff.name, note: completionNote })
  wo.completionNote = completionNote
  if (flow === 'done_pending_sign') return wo

  if (kind === 'company') {
    const signedAt = addHours(completedAt, randInt(rng, 2, 20))
    wo.events.push({ type: 'SIGNED', at: signedAt, by: company!.contactName, note: '企业电子签字确认' })
    wo.events.push({ type: 'CLOSED', at: addHours(signedAt, 0.02), by: '系统', note: '签字完成,自动关单' })
    if (spec.rating) {
      wo.satisfactionRating = spec.rating
      wo.ratingComment = spec.rating >= 3 ? pick(rng, RATING_COMMENTS_GOOD) : pick(rng, RATING_COMMENTS_BAD)
      wo.events.push({
        type: 'RATED',
        at: addHours(signedAt, randInt(rng, 1, 4)),
        by: company!.contactName,
        note: wo.ratingComment,
      })
    }
  } else {
    // 公共区域维修:物业验收关单,无签字/评价
    wo.events.push({
      type: 'CLOSED',
      at: addHours(completedAt, randInt(rng, 2, 8)),
      by: '王建军',
      note: '物业验收合格,关单',
    })
  }
  return wo
}

const COMPANY_WO_CATEGORIES: WorkOrderCategory[] = ['hvac', 'plumbing', 'electrical', 'door_access', 'other']
const PUBLIC_WO_CATEGORIES: WorkOrderCategory[] = ['public_facility', 'elevator', 'fire', 'electrical']
const RATING_POOL: (1 | 2 | 3 | 4 | 5)[] = [5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2]

/**
 * 生成 filler 工单(铺满 12 个月,保证满意度趋势逐月有数据):
 * - 历史 11 个月:每月 5 单企业已关(~85% 评价)+ 2 单公共已关(验收)
 * - 当月:企业已关 ×4、公共已关 ×2 + 开放管线(待接单/已接单/已派单/处理中/待签字/待验收)
 * - 超时未完工仅 1 单公共(故事②的企业超时单在 storyCompanies);开放单避开欠费企业
 */
export function genFillerWorkOrders(companies: Company[], rng: Rng, storyIds: Set<string>): WorkOrder[] {
  const months = lastMonths(12)
  const currentMonth = months[months.length - 1]
  const arrearsIds = new Set(COMPANY_DEFS.filter((d) => d.arrears).map((d) => d.id))
  const anyPool = companies.filter((c) => !storyIds.has(c.id))
  const safePool = shuffle(anyPool.filter((c) => !arrearsIds.has(c.id)), rng)
  const wos: WorkOrder[] = []

  // 历史月份(不含当月)
  for (const month of months.slice(0, -1)) {
    for (let i = 0; i < 5; i++) {
      wos.push(
        buildWo(
          {
            company: pick(rng, anyPool),
            category: pick(rng, COMPANY_WO_CATEGORIES),
            reported: monthDay(month, randInt(rng, 2, 24), randTime(rng)),
            flow: 'closed',
            lateCompletion: i === 0 && rng() < 0.55,
            slowResponse: i === 1 && rng() < 0.45,
            rating: rng() < 0.85 ? pick(rng, RATING_POOL) : undefined,
          },
          rng,
        ),
      )
    }
    for (let i = 0; i < 2; i++) {
      wos.push(
        buildWo(
          {
            location: pick(rng, PUBLIC_WO_LOCATIONS),
            category: pick(rng, PUBLIC_WO_CATEGORIES),
            reported: monthDay(month, randInt(rng, 3, 22), randTime(rng)),
            flow: 'closed',
          },
          rng,
        ),
      )
    }
  }

  // 当月已关单
  for (let i = 0; i < 4; i++) {
    wos.push(
      buildWo(
        {
          company: pick(rng, safePool),
          category: pick(rng, COMPANY_WO_CATEGORIES),
          reported: monthDay(currentMonth, randInt(rng, 1, 3), randTime(rng)),
          flow: 'closed',
          rating: rng() < 0.85 ? pick(rng, RATING_POOL) : undefined,
        },
        rng,
      ),
    )
  }
  for (let i = 0; i < 2; i++) {
    wos.push(
      buildWo(
        {
          location: pick(rng, PUBLIC_WO_LOCATIONS),
          category: pick(rng, PUBLIC_WO_CATEGORIES),
          reported: monthDay(currentMonth, i + 1, randTime(rng)),
          flow: 'closed',
        },
        rng,
      ),
    )
  }

  // 开放管线(SLA 内;避开欠费企业,保持收款跟进叙事纯净)
  const openSpecs: { flow: WoFlow; daysAgo: number; time: string }[] = [
    { flow: 'pending', daysAgo: 0, time: '08:47' },
    { flow: 'pending', daysAgo: 1, time: '16:40' },
    { flow: 'accepted', daysAgo: 1, time: '11:20' },
    { flow: 'dispatched', daysAgo: 1, time: '10:20' },
    { flow: 'dispatched', daysAgo: 1, time: '14:05' },
    { flow: 'in_progress', daysAgo: 1, time: '08:50' },
    { flow: 'in_progress', daysAgo: 1, time: '15:35' },
    { flow: 'done_pending_sign', daysAgo: 2, time: '09:40' },
    { flow: 'done_pending_sign', daysAgo: 2, time: '15:10' },
  ]
  openSpecs.forEach((s, i) => {
    wos.push(
      buildWo(
        {
          company: safePool[i % safePool.length],
          category: pick(rng, COMPANY_WO_CATEGORIES),
          reported: daysAgo(s.daysAgo, s.time),
          flow: s.flow,
        },
        rng,
      ),
    )
  })

  // 公共维修:今晨完工待验收 ×1、处理中 ×1、超时未完工 ×1
  wos.push(
    buildWo(
      {
        location: { label: '园区主入口道闸' },
        category: 'public_facility',
        description: '园区主入口道闸抬杆缓慢,高峰期车辆排队',
        reported: daysAgo(1, '08:20'),
        flow: 'done_pending_sign',
      },
      rng,
    ),
  )
  wos.push(
    buildWo(
      {
        location: pick(rng, PUBLIC_WO_LOCATIONS),
        category: 'electrical',
        reported: daysAgo(1, '09:10'),
        flow: 'in_progress',
      },
      rng,
    ),
  )
  wos.push(
    buildWo(
      {
        location: { zoneId: 'A', label: 'A 区地下车库' },
        category: 'public_facility',
        description: '地下车库两处照明线路故障,维修范围较大',
        reported: daysAgo(3, '11:20'),
        flow: 'in_progress',
      },
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

/**
 * filler 投诉:已关 ×4(1 条走主管介入全链)+ 已回复待确认 ×1 + 今晨待处理 ×1;
 * 另为 C-24(星野健身)补 2 条已关投诉 → 历史投诉 ≥3,命中「反复投诉」旗标。
 * 开放投诉避开欠费企业。
 */
export function genFillerComplaints(companies: Company[], rng: Rng, storyIds: Set<string>): Complaint[] {
  const arrearsIds = new Set(COMPANY_DEFS.filter((d) => d.arrears).map((d) => d.id))
  const anyPool = companies.filter((c) => !storyIds.has(c.id) && !arrearsIds.has(c.id))
  const safePool = shuffle([...anyPool], rng)
  const complaints: Complaint[] = []
  const depts: DeptCode[] = ['cleaning', 'security', 'engineering', 'security']

  const buildClosed = (company: Company, createdAt: string, dept: DeptCode, withSupervisor = false): Complaint => {
    const supervisor = DEPT_SUPERVISOR[dept] ?? '周晓燕'
    const content = pick(rng, COMPLAINT_CONTENTS)
    const dispatchedAt = addHours(createdAt, randInt(rng, 1, 4))
    const repliedAt = addHours(dispatchedAt, randInt(rng, 12, 30))
    const c: Complaint = {
      id: '',
      companyId: company.id,
      content,
      events: [
        { type: 'CREATED', at: createdAt, by: company.contactName, content },
        { type: 'DISPATCHED', at: dispatchedAt, by: '周晓燕', dept, content: '已转责任部门限期处理' },
        { type: 'REPLIED', at: repliedAt, by: supervisor, content: pick(rng, COMPLAINT_REPLIES) },
      ],
      responsibleDept: dept,
    }
    if (withSupervisor) {
      const reqAt = addHours(repliedAt, randInt(rng, 3, 8))
      const supRepliedAt = addHours(reqAt, randInt(rng, 12, 24))
      c.events.push(
        { type: 'SUPERVISOR_REQUESTED', at: reqAt, by: company.contactName, content: '对处理结果不满意,申请主管介入' },
        { type: 'SUPERVISOR_REPLIED', at: supRepliedAt, by: '陈志远', content: '已现场复核并落实整改方案,后续由客服专员每周回访,向贵司致歉' },
        { type: 'CLOSED', at: addHours(supRepliedAt, randInt(rng, 6, 20)), by: company.contactName, content: '企业确认解决,关闭投诉' },
      )
    } else {
      c.events.push({
        type: 'CLOSED',
        at: addHours(repliedAt, randInt(rng, 6, 24)),
        by: company.contactName,
        content: '企业确认解决,关闭投诉',
      })
    }
    return c
  }

  // 已关闭 ×4,分布在近几个月
  for (let i = 0; i < 4; i++) {
    complaints.push(
      buildClosed(pick(rng, anyPool), daysAgo(randInt(rng, 12, 300), randTime(rng)), depts[i], i === 0),
    )
  }

  // C-24 星野健身:再补 2 条已关 → 反复投诉旗标(≥3)
  const gym = companies.find((c) => c.id === 'C-24')
  if (gym) {
    complaints.push(buildClosed(gym, daysAgo(45, '10:20'), 'cleaning'))
    complaints.push(buildClosed(gym, daysAgo(20, '15:30'), 'security'))
    complaints.push(buildClosed(gym, daysAgo(75, '09:40'), 'engineering'))
  }

  // 已回复待企业确认 ×1(开放)
  {
    const company = safePool[5]
    const content = pick(rng, COMPLAINT_CONTENTS)
    const createdAt = daysAgo(3, '10:40')
    const dispatchedAt = addHours(createdAt, 2)
    complaints.push({
      id: '',
      companyId: company.id,
      content,
      events: [
        { type: 'CREATED', at: createdAt, by: company.contactName, content },
        { type: 'DISPATCHED', at: dispatchedAt, by: '周晓燕', dept: 'security', content: '已转秩序部限期处理' },
        { type: 'REPLIED', at: addHours(dispatchedAt, 20), by: '赵海峰', content: pick(rng, COMPLAINT_REPLIES) },
      ],
      responsibleDept: 'security',
    })
  }

  // 今晨新投诉,待处理 ×1
  {
    const company = safePool[6]
    const content = pick(rng, COMPLAINT_CONTENTS)
    complaints.push({
      id: '',
      companyId: company.id,
      content,
      events: [{ type: 'CREATED', at: daysAgo(0, '09:05'), by: company.contactName, content }],
    })
  }

  return complaints
}

// ===== 维保工单(消防/电梯/日常;计划 vs 实际)=====

const ELEVATOR_BUILDINGS = ['A4', 'B2', 'B4', 'C1']

export function genMaintenance(rng: Rng): MaintenanceOrder[] {
  const months = lastMonths(12)
  const currentMonth = months[months.length - 1]
  const orders: MaintenanceOrder[] = []
  let seq = 0
  const push = (o: Omit<MaintenanceOrder, 'id'>) => {
    seq += 1
    orders.push({ ...o, id: `MO-${String(seq).padStart(3, '0')}` })
  }

  // 消防维保:每区每月 1 次(外包)
  for (const month of months) {
    for (const zoneId of ['A', 'B', 'C']) {
      const plannedDay = randInt(rng, 6, 12)
      const plannedAt = monthDay(month, plannedDay, '09:30')
      const isCurrent = month === currentMonth
      // 当月:A、B 已执行,C 计划在 10 日(待执行)
      const executed = !isCurrent || zoneId !== 'C'
      const late = !isCurrent && rng() < 0.06
      push({
        category: 'fire',
        title: `${zoneId} 区消防设施月度维保`,
        location: `${zoneId} 区消防泵房及各楼栋消火栓`,
        plannedAt: isCurrent ? monthDay(month, zoneId === 'C' ? 10 : zoneId === 'A' ? 3 : 4, '09:30') : plannedAt,
        executedAt: executed
          ? isCurrent
            ? monthDay(month, zoneId === 'A' ? 3 : 4, '10:10')
            : addHours(plannedAt, late ? randInt(rng, 26, 40) : randInt(rng, 0, 6))
          : undefined,
        result: executed ? (rng() < 0.94 ? 'normal' : 'issue') : undefined,
        note: executed ? '设施运行正常,记录归档' : undefined,
        ownerUsername: zoneId === 'C' ? 'cs_liu' : 'cs_wang',
        executantName: '安众消防(外包)',
      })
    }
  }

  // 电梯维保:多户楼栋每月 1 次(外包)
  for (const month of months) {
    for (const buildingId of ELEVATOR_BUILDINGS) {
      const isCurrent = month === currentMonth
      const plannedAt = monthDay(month, isCurrent ? 15 : randInt(rng, 12, 20), '14:00')
      const executed = !isCurrent
      const late = executed && rng() < 0.05
      push({
        category: 'elevator',
        title: `${buildingId} 栋电梯月度维保`,
        location: `${buildingId} 栋电梯机房及轿厢`,
        plannedAt,
        executedAt: executed ? addHours(plannedAt, late ? randInt(rng, 26, 44) : randInt(rng, 0, 5)) : undefined,
        result: executed ? (rng() < 0.95 ? 'normal' : 'issue') : undefined,
        note: executed ? '维保完成,运行正常' : undefined,
        ownerUsername: buildingId.startsWith('C') ? 'cs_liu' : 'cs_wang',
        executantName: '中升电梯(外包)',
      })
    }
  }

  // 日常维保:每周 1 次(52 周),本周今晨已执行
  const DAILY_ITEMS = ['公共照明回路巡检保养', '给排水泵房例行保养', '门禁与道闸设备保养', '公共区域配电箱紧固检查']
  for (let w = 51; w >= 0; w--) {
    const plannedAt = w === 0 ? daysAgo(0, '09:00') : daysAgo(w * 7, '09:00')
    const late = w > 0 && rng() < 0.05
    push({
      category: 'daily',
      title: DAILY_ITEMS[w % DAILY_ITEMS.length],
      location: '全园区公共区域',
      plannedAt,
      executedAt: w === 0 ? daysAgo(0, '08:50') : addHours(plannedAt, late ? randInt(rng, 26, 40) : randInt(rng, 0, 6)),
      result: rng() < 0.95 ? 'normal' : 'issue',
      note: '按保养手册完成作业',
      ownerUsername: ['admin', 'cs_wang', 'cs_liu'][w % 3],
      executantName: pick(rng, ENGINEERS).name,
    })
  }

  // 超期未执行 ×1(计划前天,未执行 → 进日报风险)
  push({
    category: 'daily',
    title: '电梯机房通风设备保养',
    location: 'B2 栋电梯机房',
    plannedAt: daysAgo(2, '14:00'),
    ownerUsername: 'cs_wang',
    executantName: '刘国栋',
  })

  return orders
}

// ===== 日常巡检(近 90 天每日 2 条)=====

export function genInspections(rng: Rng): Inspection[] {
  const templateKeys = Object.keys(INSPECTION_TEMPLATES) as (keyof typeof INSPECTION_TEMPLATES)[]
  const inspectorByTemplate: Record<string, string> = {
    security: '赵海峰',
    fire: '郭永强',
    cleaning: '孙桂芳',
    equipment: '刘国栋',
  }
  /** 固定异常样本:近 90 天共 3 个异常项(key 与当日槽位的模板轮换对齐) */
  const abnormalSlots = new Map<string, { itemIdx: number; note: string }>([
    ['4-security', { itemIdx: 3, note: '非机动车占用消防通道,已现场整改并拍照留档' }],
    ['7-equipment', { itemIdx: 4, note: '地下车库两处照明不亮,已转维修工单' }],
    ['9-cleaning', { itemIdx: 3, note: '垃圾清运车晚到 2 小时,已联系清运公司' }],
  ])

  const inspections: Inspection[] = []
  let seq = 0
  for (let d = 89; d >= 0; d--) {
    for (let slot = 0; slot < 2; slot++) {
      const templateKey = templateKeys[(d + slot) % templateKeys.length]
      const template = INSPECTION_TEMPLATES[templateKey]
      const area = INSPECTION_AREAS[(d * 2 + slot) % INSPECTION_AREAS.length]
      const owner = slot === 0 ? 'cs_wang' : 'cs_liu'
      const plannedAt = daysAgo(d, slot === 0 ? '09:00' : '15:00')
      // 今天下午的巡检尚未执行
      const executed = !(d === 0 && slot === 1)
      const abnormal = abnormalSlots.get(`${d}-${templateKey}`)
      seq += 1
      inspections.push({
        id: `IS-${String(seq).padStart(3, '0')}`,
        areaLabel: area,
        templateKey,
        items: template.items.map((item, idx) => ({
          itemKey: item.key,
          ok: !(abnormal && idx === abnormal.itemIdx),
          note: abnormal && idx === abnormal.itemIdx ? abnormal.note : undefined,
        })),
        photoCount: randInt(rng, 2, 6),
        ownerUsername: owner,
        inspectorName: inspectorByTemplate[templateKey],
        plannedAt,
        executedAt: executed ? addHours(plannedAt, randInt(rng, 0, 1)) : undefined,
      })
    }
  }
  return inspections
}

// ===== 能耗核抄(14 栋 × 水/电 × 24 个月:2024-06 ~ 2026-05)=====

export function genMeterReadings(rng: Rng): MeterReading[] {
  // lastMonths(25) = 2024-06 ~ 2026-06,去掉当月(6 月月末尚未核抄)→ 24 个月
  const months = lastMonths(25).slice(0, 24)
  const areaByBuilding = new Map<string, number>()
  for (const def of COMPANY_DEFS) {
    areaByBuilding.set(def.buildingId, (areaByBuilding.get(def.buildingId) ?? 0) + def.areaSqm)
  }

  const readings: MeterReading[] = []
  let seq = 0
  for (const building of BUILDINGS) {
    const area = (areaByBuilding.get(building.id) ?? 2000) * 1.15 // 含公摊
    for (const type of ['electricity', 'water'] as const) {
      const base = type === 'electricity' ? area * 2.8 : area * 0.16
      let cursor = randInt(rng, 20000, 80000)
      months.forEach((month, idx) => {
        const m = Number(month.slice(5))
        const seasonal =
          type === 'electricity'
            ? m >= 6 && m <= 9
              ? 1.18
              : m === 12 || m <= 2
                ? 1.06
                : 1
            : m >= 6 && m <= 9
              ? 1.1
              : 1
        const growth = 1 + 0.065 * (idx / 12) // 同比约 +6.5%
        const noise = 0.97 + rng() * 0.06
        const usage = Math.round(base * seasonal * growth * noise)
        const prevValue = cursor
        cursor += usage
        seq += 1
        readings.push({
          id: `MR-${String(seq).padStart(4, '0')}`,
          meterNo: `${type === 'electricity' ? 'E' : 'W'}-${building.id}`,
          type,
          location: `${building.no}总表`,
          month,
          prevValue,
          currValue: cursor,
          ownerUsername: building.zoneId === 'C' ? 'cs_liu' : 'cs_wang',
          readerName: building.zoneId === 'C' ? '刘洋' : '王琳',
          readAt: monthDay(month, randInt(rng, 25, 28), '16:00'),
        })
      })
    }
  }
  return readings
}

// ===== 工作任务清单(年 → 季 → 月 → 周 穿透)=====

const QUARTER_CN = ['一', '二', '三', '四']

export function genWorkTasks(): WorkTask[] {
  const tasks: WorkTask[] = []
  let seq = 0
  const push = (t: Omit<WorkTask, 'id'>): string => {
    seq += 1
    const id = `TK-${String(seq).padStart(3, '0')}`
    tasks.push({ ...t, id })
    return id
  }

  YEAR_TASK_DEFS.forEach((def) => {
    const yearId = push({
      level: 'year',
      title: def.title,
      ownerUsername: def.ownerUsername,
      periodLabel: '2026',
      dueAt: '2026-12-31',
      status: 'open',
    })
    for (let q = 1; q <= 4; q++) {
      const quarterEnd = ['2026-03-31', '2026-06-30', '2026-09-30', '2026-12-31'][q - 1]
      const quarterId = push({
        level: 'quarter',
        parentId: yearId,
        title: def.quarterTitle.replace('{q}', QUARTER_CN[q - 1]),
        ownerUsername: def.ownerUsername,
        periodLabel: `2026-Q${q}`,
        dueAt: quarterEnd,
        status: q === 1 ? 'done' : 'open',
        completedAt: q === 1 ? '2026-03-28' : undefined,
      })
      // 当季(Q2)拆月度任务
      if (q === 2) {
        for (const m of [4, 5, 6]) {
          const month = `2026-0${m}`
          const monthEnd = `${month}-${m === 6 ? '30' : m === 4 ? '30' : '31'}`
          const monthId = push({
            level: 'month',
            parentId: quarterId,
            title: def.monthTitle.replace('{m}', String(m)),
            ownerUsername: def.ownerUsername,
            periodLabel: month,
            dueAt: monthEnd,
            status: m < 6 ? 'done' : 'open',
            completedAt: m < 6 ? `${month}-${m === 4 ? '29' : '30'}` : undefined,
          })
          // 当月(6 月)拆周任务
          if (m === 6) {
            const weekDue = ['2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28']
            weekDue.forEach((due, wIdx) => {
              push({
                level: 'week',
                parentId: monthId,
                title: def.weekTitle.replace('{w}', String(wIdx + 1)),
                ownerUsername: def.ownerUsername,
                periodLabel: `2026-06 第${wIdx + 1}周`,
                dueAt: due,
                // 第 1 周:任务一、三已完成,任务二进行中(可演示「标记完成 → 达成率变化」)
                status: wIdx === 0 && def.ownerUsername !== 'cs_wang' ? 'done' : 'open',
                completedAt: wIdx === 0 && def.ownerUsername !== 'cs_wang' ? '2026-06-05' : undefined,
              })
            })
          }
        }
      }
    }
  })
  return tasks
}

// ===== 满意度调研(两期已结束 + 一期进行中)=====

export interface SurveysResult {
  surveys: Survey[]
  responses: SurveyResponse[]
}

export function genSurveys(companies: Company[], rng: Rng): SurveysResult {
  const surveys: Survey[] = [
    { id: 'SR-01', title: '2025 年下半年园区服务满意度调研', periodLabel: '2025 年下半年', status: 'closed', publishedBy: '陈志远', publishedAt: '2025-12-01T09:00:00' },
    { id: 'SR-02', title: '2026 年第一季度园区服务满意度调研', periodLabel: '2026 年第一季度', status: 'closed', publishedBy: '陈志远', publishedAt: '2026-03-25T09:00:00' },
    { id: 'SR-03', title: '2026 年 6 月园区服务满意度调研', periodLabel: '2026 年 6 月', status: 'active', publishedBy: '陈志远', publishedAt: '2026-06-01T09:00:00' },
  ]

  const responses: SurveyResponse[] = []
  let seq = 0
  const respond = (surveyId: string, companyId: string, base: number, submittedAt: string, comment?: string) => {
    seq += 1
    const scores: Record<string, number> = {}
    for (const q of SURVEY_QUESTIONS) {
      const noisy = base + (rng() - 0.5) * 1.2
      scores[q.key] = Math.max(2, Math.min(5, Math.round(noisy)))
    }
    responses.push({ id: `SRR-${String(seq).padStart(3, '0')}`, surveyId, companyId, scores, comment, submittedAt })
  }

  // 两期已结束:全部 30 家企业参与
  for (const c of companies) {
    const base1 = c.id === 'C-13' ? 3.4 : 4.2 + rng() * 0.5
    respond('SR-01', c.id, base1, addHours('2025-12-01T09:00:00', randInt(rng, 24, 24 * 12)))
    const base2 = c.id === 'C-13' ? 3.1 : c.id === 'C-03' ? 4.9 : 4.3 + rng() * 0.5
    respond(
      'SR-02',
      c.id,
      base2,
      addHours('2026-03-25T09:00:00', randInt(rng, 24, 24 * 10)),
      c.id === 'C-13' ? '空调与货梯问题反复出现,希望根治。' : undefined,
    )
  }

  // 进行中一期:12 家已填(不含故事①,留给企业端现场演示填写)
  const doneIds = ['C-01', 'C-02', 'C-05', 'C-08', 'C-11', 'C-13', 'C-14', 'C-22', 'C-24', 'C-26', 'C-28', 'C-30']
  for (const id of doneIds) {
    const base = id === 'C-13' ? 3.2 : 4.3 + rng() * 0.5
    respond('SR-03', id, base, addHours('2026-06-01T09:00:00', randInt(rng, 12, 24 * 4)))
  }

  return { surveys, responses }
}

// ===== 发票(2026-03 ~ 2026-06;已缴账单出票)=====

export function genInvoices(companies: Company[], bills: Bill[], rng: Rng): Invoice[] {
  const months = lastMonths(4) // 2026-03 ~ 2026-06
  const invoices: Invoice[] = []
  let seq = 0
  const catLabel: Record<FeeCategory, string> = {
    property: '物业服务费',
    vehicle: '车辆服务费',
    utility: '水电能耗费',
    valueAdded: '增值服务费',
  }

  const push = (companyId: string, month: string, category: FeeCategory, amount: number, uploadedAt: string) => {
    seq += 1
    const company = companies.find((c) => c.id === companyId)!
    invoices.push({
      id: `IV-${String(seq).padStart(3, '0')}`,
      companyId,
      month,
      category,
      amount,
      fileName: `发票-${company.name}-${month}-${catLabel[category]}.pdf`,
      fileUrl: `/invoices/sample-${(seq % 3) + 1}.pdf`,
      uploadedBy: zoneCsName(company.zoneId),
      uploadedAt,
    })
  }

  for (const company of companies) {
    for (const month of months) {
      const monthBills = bills.filter((b) => b.companyId === company.id && b.month === month)
      const paidOf = (category: FeeCategory) => {
        const list = monthBills.filter((b) => b.category === category)
        if (list.length === 0 || list.some((b) => b.paidAmount < b.amount)) return 0
        return list.reduce((s, b) => s + b.amount, 0)
      }
      const propertyPaid = paidOf('property')
      if (propertyPaid > 0) {
        const paidAt = monthBills.find((b) => b.category === 'property')!.paidAt!
        push(company.id, month, 'property', propertyPaid, addHours(paidAt, randInt(rng, 24, 72)))
        // 故事①:全部费类逐月开票(发票管理演示主角)
        if (company.id === 'C-03') {
          for (const category of ['utility', 'vehicle'] as FeeCategory[]) {
            const amt = paidOf(category)
            if (amt > 0) push(company.id, month, category, amt, addHours(paidAt, randInt(rng, 24, 72)))
          }
        }
      }
    }
  }
  return invoices
}

// ===== ID 分配 =====

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
