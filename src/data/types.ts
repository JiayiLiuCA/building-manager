// ============================================================
// 全部实体接口与状态枚举 —— 整个 mock 数据层的契约(产业园版)
// 设计原则:以「企业」为中心串联缴费/工单/投诉/收款跟进;
// 工单与投诉的状态不落库,由事件数组派生(单一事实源);
// 企业相关数据的读取一律先经 selectors/scope.ts 过滤(权限唯一入口)。
// ============================================================

// ===== 账号与角色 =====
export type Role = 'supervisor' | 'cs' | 'company'

export interface Account {
  username: string
  password: string
  role: Role
  displayName: string
  /** 企业账号关联的企业 id */
  companyId?: string
}

export interface CurrentUser {
  role: Role
  username: string
  displayName: string
  companyId?: string
}

/** 客服管辖企业名单 —— 权限设置页编辑,visibleCompanyIds 的数据源 */
export interface CsAssignment {
  csUsername: string
  companyIds: string[]
}

// ===== 空间三级层级:园区 → 区 → 楼栋(冗余上级 id,便于过滤与聚合)=====
export interface Park {
  id: string // 'HM'
  name: string // '和美产业园'
}

export interface Zone {
  id: string // 'A'
  name: string // 'A 区'
}

export interface Building {
  id: string // 'A1'
  zoneId: string
  no: string // 'A1 栋'
  floors: number
}

// ===== 企业(核心实体)=====
/** 入驻形态:整栋独占 / 多户楼栋内占若干楼层·单元 */
export type Occupancy =
  | { type: 'whole' }
  | { type: 'partial'; floors: number[]; unitLabel: string } // unitLabel 如 '3-4 层' / '1 层 101-104'

export type PaymentMethod = 'transfer' | 'cheque' | 'online'

/** 缴费习惯 —— 收款跟进前置判断、企业档案、日报付款日提示 三处消费 */
export interface PaymentHabit {
  /** 每月付款日(1-28) */
  payDay: number
  method: PaymentMethod
  note?: string
}

export interface Company {
  id: string // 'C-01'
  name: string
  industry: string
  zoneId: string
  buildingId: string
  occupancy: Occupancy
  areaSqm: number
  contactName: string
  contactPhone: string
  contractStart: string // 'yyyy-MM'
  contractEnd: string // 'yyyy-MM'
  /** 可缺失:无习惯记录的欠费企业 → 收款跟进「待沟通核实」 */
  paymentHabit?: PaymentHabit
}

// ===== 账单:四大费类,状态由 paidAmount 派生 =====
export type FeeCategory = 'property' | 'vehicle' | 'utility' | 'valueAdded'
/** 车辆服务三口径;temporary(临时停放)为园区级收入,不挂企业 */
export type VehicleSub = 'fixed' | 'temporary' | 'leased'
export type UtilitySub = 'water' | 'electricity'
export type ValueAddedType = 'home_service' | 'asset_ops' | 'retail'
export type BillSubType = VehicleSub | UtilitySub | ValueAddedType

export type BillStatus = 'paid' | 'unpaid' | 'partial'

export interface Bill {
  id: string // 'B-C-01-2026-06-vehicle-fixed'(含 subType 保证唯一)
  /** 为空 = 园区级公共收入(仅临时停放):物业角色可见、企业端不可见、不进楼栋收缴表 */
  companyId?: string
  category: FeeCategory
  subType?: BillSubType
  month: string // '2026-06'
  /** 应收(减免后金额,减免明细见 Waiver) */
  amount: number
  paidAmount: number
  paidAt?: string
  /** 增值服务账单关联的合同 */
  contractId?: string
}

/** 费用减免记录 —— 驾驶舱减免 KPI、企业档案、收款跟进行内展示 */
export interface Waiver {
  id: string // 'WV-001'
  companyId: string
  month: string
  category: FeeCategory
  amount: number
  reason: string
}

/** 收费目标(费类 × 月);季/年目标 = Σ月目标(只累计数据窗内月份) */
export interface RevenueTarget {
  category: FeeCategory
  month: string
  amount: number
}

/** 增值服务合同 */
export interface ValueAddedContract {
  id: string // 'VA-01'
  companyId: string
  type: ValueAddedType
  name: string
  monthlyAmount: number
  start: string // 'yyyy-MM'
  end: string // 'yyyy-MM'
}

// ===== 部门与员工 =====
export type DeptCode = 'engineering' | 'customer_service' | 'security' | 'cleaning' | 'management'

export interface Staff {
  id: string
  name: string
  dept: DeptCode
  role: 'staff' | 'supervisor' | 'manager'
}

// ===== 工单:events 数组即事实源 =====
/** 企业报事报修 / 公共区域维修 */
export type WorkOrderKind = 'company' | 'public'

export type WorkOrderCategory =
  | 'hvac' // 暖通空调
  | 'plumbing' // 给排水
  | 'electrical' // 强弱电
  | 'elevator' // 电梯设备
  | 'fire' // 消防设施
  | 'door_access' // 门禁门窗
  | 'public_facility' // 公共设施
  | 'other'

export type WorkOrderEventType =
  | 'REPORTED' // 企业报修 / 物业登记公共维修
  | 'ACCEPTED' // 物业接单
  | 'DISPATCHED' // 派单到部门/人员
  | 'APPOINTMENT_SET' // 预约处理时间
  | 'COMPLETED' // 完工提交
  | 'SIGNED' // 企业电子签字(公共单无此步)
  | 'CLOSED' // 关单(企业单=签字后自动;公共单=物业验收)
  | 'RATED' // 企业评价(不参与状态派生;公共单无此步)

export interface WorkOrderEvent {
  type: WorkOrderEventType
  at: string // ISO 时间
  by: string // 操作人显示名
  note?: string
}

/**
 * 派生状态机(由最后一个状态事件决定,RATED 除外):
 * REPORTED→pending / ACCEPTED→accepted / DISPATCHED→dispatched
 * APPOINTMENT_SET→in_progress / COMPLETED→done_pending_sign(公共单文案「待验收」)
 * SIGNED·CLOSED→closed
 */
export type WorkOrderStatus =
  | 'pending'
  | 'accepted'
  | 'dispatched'
  | 'in_progress'
  | 'done_pending_sign'
  | 'closed'

/** 公共区域维修的位置(不挂企业) */
export interface WorkOrderLocation {
  zoneId?: string
  buildingId?: string
  label: string // '园区中央广场' / 'B 区 B2 栋大堂'
}

export interface WorkOrder {
  id: string // 'WO-20260601-001'
  kind: WorkOrderKind
  /** kind='company' 必有 */
  companyId?: string
  /** kind='public' 必有 */
  location?: WorkOrderLocation
  category: WorkOrderCategory
  description: string
  events: WorkOrderEvent[]
  assignedDept?: DeptCode
  assignedStaffId?: string
  appointmentAt?: string
  completionNote?: string
  satisfactionRating?: 1 | 2 | 3 | 4 | 5
  ratingComment?: string
}

// ===== 投诉:同款事件源模式 =====
export type ComplaintEventType =
  | 'CREATED' // 提交投诉
  | 'DISPATCHED' // 派至唯一责任部门
  | 'REPLIED' // 部门回复
  | 'SUPERVISOR_REQUESTED' // 企业不满意,申请主管介入
  | 'SUPERVISOR_REPLIED' // 主管回复
  | 'CLOSED' // 投诉关闭

export interface ComplaintEvent {
  type: ComplaintEventType
  at: string
  by: string
  content?: string
  dept?: DeptCode
}

/**
 * 派生状态机:CREATED→pending / DISPATCHED→processing / REPLIED→replied
 * SUPERVISOR_REQUESTED→supervisor / SUPERVISOR_REPLIED→replied / CLOSED→closed
 */
export type ComplaintStatus = 'pending' | 'processing' | 'replied' | 'supervisor' | 'closed'

export interface Complaint {
  id: string // 'CP-001'
  companyId: string
  /** 关联工单(可空) */
  workOrderId?: string
  content: string
  events: ComplaintEvent[]
  responsibleDept?: DeptCode
}

// ===== 维保工单(服务品质;数据与企业无关、按人归属)=====
export type MaintenanceCategory = 'fire' | 'elevator' | 'daily'

export interface MaintenanceOrder {
  id: string // 'MO-001'
  category: MaintenanceCategory
  title: string
  location: string // '消防泵房' / 'A4 栋 2 号电梯'
  plannedAt: string // 计划执行时间(ISO)
  executedAt?: string // 实际执行时间;为空=未执行
  result?: 'normal' | 'issue'
  note?: string
  /** 权限归属(主管/客服账号名) */
  ownerUsername: string
  /** 展示用执行人(维保工程师/外包单位) */
  executantName: string
}

// ===== 日常巡检(内控;制式表单结构见 seed/constants INSPECTION_TEMPLATES)=====
export type InspectionTemplateKey = 'security' | 'fire' | 'cleaning' | 'equipment'

export interface InspectionItemResult {
  itemKey: string
  ok: boolean
  note?: string
}

export interface Inspection {
  id: string // 'IS-001'
  areaLabel: string // 'A 区外围/门岗' 等
  templateKey: InspectionTemplateKey
  items: InspectionItemResult[]
  /** 照片占位数量(演示不存真图) */
  photoCount: number
  ownerUsername: string
  inspectorName: string
  plannedAt: string
  executedAt?: string
}

// ===== 能耗核抄(内控;24 个月,支撑同比/环比)=====
export interface MeterReading {
  id: string // 'MR-0001'
  meterNo: string // 'W-A1' / 'E-B2'
  type: UtilitySub
  location: string // 'A1 栋总表'
  month: string
  prevValue: number
  currValue: number
  ownerUsername: string
  readerName: string
  readAt: string
}

// ===== 工作任务清单(内控;年/季/月/周四级穿透)=====
export type TaskLevel = 'year' | 'quarter' | 'month' | 'week'

export interface WorkTask {
  id: string // 'TK-001'
  level: TaskLevel
  /** 上级任务(year 无) */
  parentId?: string
  title: string
  ownerUsername: string
  periodLabel: string // '2026' / '2026-Q2' / '2026-06' / '2026-06 第1周'
  dueAt: string // 'yyyy-MM-dd'
  status: 'open' | 'done'
  completedAt?: string
}

// ===== 智能门锁(TTLock WiFi 锁,单主账号 + 应用层权限;设计详见 docs/lock-module-design.md)=====
/** 锁是园区资产,归属空间;与企业的关系由 lockAssignments 派生,不在锁上冗余存 companyId */
export type LockKind = 'unit' | 'building_gate' | 'public'

export interface DoorLock {
  id: string // 'LK-001'
  name: string // 'A1 栋 301 门锁'
  kind: LockKind
  zoneId: string
  buildingId: string
  /** 大门/公共锁可空 */
  floor?: number
  doorLabel: string // '301' / '一层大堂' / '强电井'
  sn: string // 'TTL-8F2A31'(演示假 SN)
  model: string
  installedAt: string // ISO
  // —— 模拟 TTLock 云端实时状态 ——
  isOnline: boolean
  /** 0-100;≤20 视为低电量 */
  battery: number
  /** WiFi 信号:3 强 / 2 中 / 1 差 / 0 未知 */
  rssiGrade: 0 | 1 | 2 | 3
  remoteUnlockEnabled: boolean
  /** 省电模式开启时云端无法主动下发指令(对应真实错误码 -3035) */
  powerSavingMode: boolean
}

/** 锁分配记录 —— 退租重分配的事实源;revokedAt 为空 = 当前生效 */
export interface LockAssignment {
  id: string // 'LA-001'
  lockId: string
  companyId: string
  /** 企业名快照:企业迁出后分配历史仍能显示上一家名称 */
  companyNameSnapshot: string
  assignedAt: string
  assignedBy: string // 操作人显示名
  revokedAt?: string
  revokedBy?: string
  revokeReason?: string // '企业退租清退' / '单锁回收调整'
}

// ===== 门锁密码(对应 TTLock keyboardPwd 随机/自定义两套方案)=====
export type PasscodeKind = 'random' | 'custom'
/** 随机密码:单次/限期/永久/循环;自定义密码:限期/永久 */
export type PasscodeType = 'once' | 'period' | 'permanent' | 'cycle_daily' | 'cycle_weekday' | 'cycle_weekend'
export type PasscodePurpose = 'staff' | 'visitor' | 'cleaning' | 'other'

export interface LockPasscode {
  id: string // 'PC-0001'
  lockId: string
  kind: PasscodeKind
  type: PasscodeType
  /** 命名规范「企业-用途-人名」,通行记录靠它辨人 */
  name: string
  code: string // 4-9 位数字(演示明文)
  startAt: string
  /** permanent 无;循环类型 = 每日时段模板的起止 */
  endAt?: string
  purpose: PasscodePurpose
  /** 归属企业;物业为大门/公共锁发的可空 */
  companyId?: string
  createdAt: string
  createdBy: string // 显示名
  createdByRole: 'property' | 'company'
  /** 软禁用(真实对接 = 远程改有效期挂起,可恢复) */
  disabledAt?: string
  /** 软删除(真实对接 = deleteType 2 远程删除;保留审计) */
  deletedAt?: string
}

/**
 * 密码状态派生(lockSelectors):
 * deletedAt→deleted(默认过滤) > disabledAt→disabled > now<startAt→pending
 * > endAt<now→expired > 其余 active
 */
export type PasscodeStatus = 'active' | 'pending' | 'disabled' | 'expired' | 'deleted'

// ===== 通行记录(模拟 TTLock 回调推送的开锁记录)=====
export type UnlockMethod = 'remote' | 'passcode' | 'app_ble' | 'ic_card' | 'fingerprint'

export interface UnlockRecord {
  id: string // 'UR-00001'
  lockId: string
  at: string
  method: UnlockMethod
  success: boolean
  /** 操作者描述:远程=账号显示名;密码=密码名称;蓝牙=钥匙持有人 */
  actorLabel: string
  /** 应用层审计:触发远程开锁的系统账号(TTLock 侧操作人恒为主账号,记账靠自己) */
  byUsername?: string
  /** 记录发生时锁的分配企业(快照;换租后旧记录不随锁转移给新企业) */
  companyId?: string
  passcodeId?: string
}

/** 客服门锁管辖名单 —— 权限设置页编辑;一把锁只归一位客服(互斥同企业名单) */
export interface CsLockAssignment {
  csUsername: string
  lockIds: string[]
}

// ===== 通知管理 =====
export type NoticeType = 'public_repair' | 'water_outage' | 'power_outage' | 'general'

export type NoticeScope =
  | { level: 'park' }
  | { level: 'zone'; zoneId: string }
  | { level: 'building'; buildingId: string }
  | { level: 'company'; companyIds: string[] }

/** 状态派生:revokedAt→已撤销;endAt<now→已过期;否则生效中 */
export type NoticeStatus = 'active' | 'expired' | 'revoked'

export interface Notice {
  id: string // 'NT-001'
  type: NoticeType
  title: string
  content: string
  scope: NoticeScope
  startAt: string // ISO
  endAt: string // ISO
  publishedBy: string // 发布人显示名
  publishedByUsername: string
  publishedAt: string
  revokedAt?: string
  /** 由公共区域维修工单一键生成时关联 */
  relatedWorkOrderId?: string
}

// ===== 发票管理(企业 × 月份 × 费类)=====
export interface Invoice {
  id: string // 'IV-001'
  companyId: string
  month: string
  category: FeeCategory
  amount: number
  fileName: string
  /** seed 预置记录指向 public/invoices/ 示例 PDF;运行时上传仅记录文件名 */
  fileUrl?: string
  uploadedBy: string
  uploadedAt: string
}

// ===== 满意度调研(制式问卷题目见 seed/constants SURVEY_QUESTIONS)=====
export interface Survey {
  id: string // 'SR-01'
  title: string
  periodLabel: string // '2025 年下半年' / '2026 年 6 月'
  status: 'active' | 'closed'
  publishedBy: string
  publishedAt: string
}

export interface SurveyResponse {
  id: string // 'SRR-001'
  surveyId: string
  companyId: string
  /** 题目 key → 1~5 分 */
  scores: Record<string, number>
  comment?: string
  submittedAt: string
}

// ===== 收款跟进(原催缴弱化改造)=====
/** 前置判断:🟢建议跟进 / 🟠暂缓(服务问题未闭环)/ ⚪️暂不跟进·待沟通核实 —— 实时派生,发起跟进时快照 */
export type FollowUpSuggestion = 'collect' | 'hold' | 'pending'

export interface FollowUpRecord {
  id: string // 'FU-001'
  companyId: string
  createdAt: string
  byUsername: string
  arrearsAmountSnapshot: number
  arrearsMonthsSnapshot: number
  suggestionSnapshot: FollowUpSuggestion
  status: 'active' | 'resolved'
  resolvedAt?: string
}

// ===== AI 文案 / 客服 =====
export interface DashboardAiSummary {
  headline: string
  paragraphs: string[]
  sections: { label: string; text: string }[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  at: string
}

/** AI 客服规则匹配所需的企业上下文(由 store 组装,避免规则文件依赖 store) */
export interface ChatContext {
  companyName: string
  locationLabel: string
  areaSqm: number
  monthlyPropertyFee: number
  arrearsAmount: number
  arrearsMonths: number
  openWorkOrders: { id: string; statusLabel: string }[]
  activeNoticeTitles: string[]
  habitText?: string
}

// ===== 数据切片汇总(seed 的产出、selectors 的输入)=====
export interface AppData {
  park: Park
  zones: Zone[]
  buildings: Building[]
  companies: Company[]
  staff: Staff[]
  accounts: Account[]
  csAssignments: CsAssignment[]
  doorLocks: DoorLock[]
  lockAssignments: LockAssignment[]
  lockPasscodes: LockPasscode[]
  unlockRecords: UnlockRecord[]
  csLockAssignments: CsLockAssignment[]
  bills: Bill[]
  waivers: Waiver[]
  revenueTargets: RevenueTarget[]
  valueAddedContracts: ValueAddedContract[]
  workOrders: WorkOrder[]
  complaints: Complaint[]
  maintenanceOrders: MaintenanceOrder[]
  inspections: Inspection[]
  meterReadings: MeterReading[]
  workTasks: WorkTask[]
  notices: Notice[]
  invoices: Invoice[]
  surveys: Survey[]
  surveyResponses: SurveyResponse[]
  followUpRecords: FollowUpRecord[]
}
