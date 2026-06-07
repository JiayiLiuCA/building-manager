// ============================================================
// 全部实体接口与状态枚举 —— 整个 mock 数据层的契约
// 设计原则:以「户」为中心串联缴费/工单/投诉/催缴;
// 工单与投诉的状态不落库,由事件数组派生(单一事实源)。
// ============================================================

// ===== 账号与角色 =====
export type Role = 'property' | 'resident'

export interface Account {
  username: string
  password: string
  role: Role
  displayName: string
  /** 业主账号关联的业主 id */
  residentId?: string
}

export interface CurrentUser {
  role: Role
  username: string
  displayName: string
  residentId?: string
  householdId?: string
}

// ===== 空间四级层级(冗余上级 id,便于过滤与聚合)=====
export interface Community {
  id: string // 'HY'
  name: string // '和园'
}

export interface Building {
  id: string // 'HY-1'
  communityId: string
  no: string // '1栋'
}

export interface Unit {
  id: string // 'HY-1-1'
  buildingId: string
  communityId: string
  no: string // '1单元'
}

/** 欠费数据异常类型:疑似空置未登记 / 数据错误 —— 触发催缴建议「数据待核实」 */
export type HouseholdAnomaly = 'suspected_vacant' | 'data_error'

export interface Household {
  id: string // 'HY-1-1-0101'
  /** 完整展示名:'和园1栋1单元101' */
  householdNo: string
  roomNo: string // '101'
  communityId: string
  buildingId: string
  unitId: string
  ownerName: string
  ownerPhone: string
  areaSqm: number
  /** 已登记空置 → 物业费半价、水电停供 */
  isVacant: boolean
  /** 空置起始月份 'yyyy-MM' */
  vacantSince?: string
  anomaly: HouseholdAnomaly | null
}

export interface Resident {
  id: string
  name: string
  phone: string
  householdId: string
}

// ===== 账单(状态由 paidAmount 派生,不单独存储)=====
export type FeeType = 'property' | 'water' | 'electricity' | 'parking'

export type BillStatus = 'paid' | 'unpaid' | 'partial'

export interface Bill {
  id: string // 'B-HY-1-1-0101-2026-06-property'
  householdId: string
  feeType: FeeType
  month: string // '2026-06'
  amount: number
  paidAmount: number
  paidAt?: string
  /** 空置半价标记(仅物业费) */
  isHalfPrice: boolean
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
export type WorkOrderCategory = 'plumbing' | 'electrical' | 'door_window' | 'public_area' | 'other'

export type WorkOrderEventType =
  | 'REPORTED' // 业主报修
  | 'ACCEPTED' // 物业接单
  | 'DISPATCHED' // 派单到部门/人员
  | 'APPOINTMENT_SET' // 预约上门时间
  | 'COMPLETED' // 完工提交
  | 'SIGNED' // 业主电子签字
  | 'CLOSED' // 关单
  | 'RATED' // 业主评价(不参与状态派生)

export interface WorkOrderEvent {
  type: WorkOrderEventType
  at: string // ISO 时间
  by: string // 操作人显示名
  note?: string
}

/**
 * 派生状态机(由最后一个状态事件决定,RATED 除外):
 * REPORTED→pending 待接单 / ACCEPTED→accepted 已接单 / DISPATCHED→dispatched 已派单
 * APPOINTMENT_SET→in_progress 处理中 / COMPLETED→done_pending_sign 已完成待签字
 * SIGNED·CLOSED→closed 已关单
 */
export type WorkOrderStatus =
  | 'pending'
  | 'accepted'
  | 'dispatched'
  | 'in_progress'
  | 'done_pending_sign'
  | 'closed'

export interface WorkOrder {
  id: string // 'WO-20260601-001'
  householdId: string
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
  | 'SUPERVISOR_REQUESTED' // 业主不满意,申请主管介入
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
 * 派生状态机:CREATED→pending 待处理 / DISPATCHED→processing 处理中 / REPLIED→replied 已回复
 * SUPERVISOR_REQUESTED→supervisor 主管介入中 / SUPERVISOR_REPLIED→replied / CLOSED→closed 已关闭
 */
export type ComplaintStatus = 'pending' | 'processing' | 'replied' | 'supervisor' | 'closed'

export interface Complaint {
  id: string // 'CP-001'
  householdId: string
  /** 关联工单(可空) */
  workOrderId?: string
  content: string
  events: ComplaintEvent[]
  responsibleDept?: DeptCode
}

// ===== 催缴 =====
/** 催缴建议:建议催缴 / 暂缓催缴 / 数据待核实 —— 实时派生,发起催缴时才快照 */
export type DunningSuggestion = 'collect' | 'hold' | 'verify'

export interface DunningRecord {
  id: string // 'DN-001'
  householdId: string
  createdAt: string
  arrearsAmountSnapshot: number
  arrearsMonthsSnapshot: number
  suggestionSnapshot: DunningSuggestion
  status: 'active' | 'resolved'
  resolvedAt?: string
  /** 长期欠费催缴无果,标记上报 → 出现在驾驶舱风险清单/日报 */
  isReported: boolean
  reportedAt?: string
}

// ===== 空置水电待办 =====
export interface ServiceTask {
  id: string // 'ST-001'
  householdId: string
  type: 'CUT_UTILITIES' | 'RESTORE_UTILITIES'
  note: string
  status: 'open' | 'done'
  createdAt: string
}

// ===== 日报 / AI 文案 / 客服 =====
export interface DingTalkEntry {
  id: string
  time: string // 'HH:mm'
  author: string
  channel: 'group' | 'report' | 'log'
  content: string
}

export interface DailyReport {
  date: string // 'yyyy-MM-dd'
  summary: {
    today: string[] // 今日事项
    tomorrow: string[] // 明日计划
    owners: string[] // 责任人
    risks: string[] // 风险点
  }
  sourceEntries: DingTalkEntry[]
}

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

/** AI 客服规则匹配所需的业主上下文(由 store 组装,避免规则文件依赖 store) */
export interface ChatContext {
  ownerName: string
  householdLabel: string
  areaSqm: number
  monthlyPropertyFee: number
  arrearsAmount: number
  arrearsMonths: number
  openWorkOrders: { id: string; statusLabel: string }[]
}

// ===== 数据切片汇总(seed 的产出、selectors 的输入)=====
export interface AppData {
  communities: Community[]
  buildings: Building[]
  units: Unit[]
  households: Household[]
  residents: Resident[]
  staff: Staff[]
  accounts: Account[]
  bills: Bill[]
  workOrders: WorkOrder[]
  complaints: Complaint[]
  dunningRecords: DunningRecord[]
  serviceTasks: ServiceTask[]
}
