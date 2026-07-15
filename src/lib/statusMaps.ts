import type {
  BillStatus,
  BillSubType,
  ComplaintEventType,
  ComplaintStatus,
  DeptCode,
  FeeCategory,
  FollowUpSuggestion,
  InspectionTemplateKey,
  LockKind,
  MaintenanceCategory,
  NoticeStatus,
  NoticeType,
  PasscodeKind,
  PasscodePurpose,
  PasscodeStatus,
  PasscodeType,
  PaymentMethod,
  TaskLevel,
  UnlockMethod,
  UtilitySub,
  ValueAddedType,
  VehicleSub,
  WorkOrderCategory,
  WorkOrderEventType,
  WorkOrderKind,
  WorkOrderStatus,
} from '../data/types'

// ============================================================
// 全站唯一的状态着色与中文文案入口。
// 状态色约定:成功=绿(emerald) 警告=橙(amber) 危险=红(red) 信息=蓝(blue)
// ============================================================

export interface StatusMeta {
  label: string
  /** 徽章配色(浅底 + 深字 + 描边) */
  className: string
}

const emerald = 'bg-emerald-50 text-emerald-700 border-emerald-200'
const amber = 'bg-amber-50 text-amber-700 border-amber-200'
const red = 'bg-red-50 text-red-700 border-red-200'
const blue = 'bg-blue-50 text-blue-700 border-blue-200'
const sky = 'bg-sky-50 text-sky-700 border-sky-200'
const indigo = 'bg-indigo-50 text-indigo-700 border-indigo-200'
const violet = 'bg-violet-50 text-violet-700 border-violet-200'
const zinc = 'bg-zinc-100 text-zinc-600 border-zinc-200'

// ===== 工单 =====
export const workOrderStatusMap: Record<WorkOrderStatus, StatusMeta> = {
  pending: { label: '待接单', className: amber },
  accepted: { label: '已接单', className: sky },
  dispatched: { label: '已派单', className: blue },
  in_progress: { label: '处理中', className: indigo },
  done_pending_sign: { label: '已完成待签字', className: violet },
  closed: { label: '已关单', className: emerald },
}

/** 按工单类型取状态文案:公共区域维修无签字主体,完工后显示「待验收」 */
export function getWoStatusMeta(status: WorkOrderStatus, kind: WorkOrderKind): StatusMeta {
  if (kind === 'public' && status === 'done_pending_sign') {
    return { label: '已完成待验收', className: violet }
  }
  return workOrderStatusMap[status]
}

export const workOrderKindMap: Record<WorkOrderKind, StatusMeta> = {
  company: { label: '企业报事报修', className: blue },
  public: { label: '公共区域维修', className: indigo },
}

export const workOrderCategoryMap: Record<WorkOrderCategory, string> = {
  hvac: '暖通空调',
  plumbing: '给排水',
  electrical: '强弱电',
  elevator: '电梯设备',
  fire: '消防设施',
  door_access: '门禁门窗',
  public_facility: '公共设施',
  other: '其他',
}

/** 工单时间线节点文案 */
export const workOrderEventMap: Record<WorkOrderEventType, string> = {
  REPORTED: '报修登记',
  ACCEPTED: '物业接单',
  DISPATCHED: '派单',
  APPOINTMENT_SET: '预约时间',
  COMPLETED: '完工提交',
  SIGNED: '企业电子签字',
  CLOSED: '关单',
  RATED: '企业评价',
}

// ===== 投诉 =====
export const complaintStatusMap: Record<ComplaintStatus, StatusMeta> = {
  pending: { label: '待处理', className: amber },
  processing: { label: '处理中', className: blue },
  replied: { label: '已回复', className: violet },
  supervisor: { label: '主管介入中', className: red },
  closed: { label: '已关闭', className: emerald },
}

/** 投诉时间线节点文案 */
export const complaintEventMap: Record<ComplaintEventType, string> = {
  CREATED: '提交投诉',
  DISPATCHED: '派至责任部门',
  REPLIED: '部门回复',
  SUPERVISOR_REQUESTED: '申请主管介入',
  SUPERVISOR_REPLIED: '主管回复',
  CLOSED: '投诉关闭',
}

// ===== 账单与费类 =====
export const billStatusMap: Record<BillStatus, StatusMeta> = {
  paid: { label: '已缴', className: emerald },
  unpaid: { label: '未缴', className: red },
  partial: { label: '部分缴纳', className: amber },
}

export const feeCategoryMap: Record<FeeCategory, StatusMeta> = {
  property: { label: '物业服务费', className: blue },
  vehicle: { label: '车辆服务费', className: violet },
  utility: { label: '水电能耗费', className: sky },
  valueAdded: { label: '增值服务费', className: emerald },
}

export const vehicleSubMap: Record<VehicleSub, string> = {
  fixed: '固定车位收入',
  temporary: '临时停放收入',
  leased: '租赁车位收入',
}

export const utilitySubMap: Record<UtilitySub, string> = {
  water: '购水',
  electricity: '购电',
}

export const valueAddedTypeMap: Record<ValueAddedType, string> = {
  home_service: '到家服务',
  asset_ops: '资产运营',
  retail: '零售服务',
}

export const billSubTypeMap: Record<BillSubType, string> = {
  ...vehicleSubMap,
  ...utilitySubMap,
  ...valueAddedTypeMap,
}

export const paymentMethodMap: Record<PaymentMethod, string> = {
  transfer: '对公转账',
  cheque: '支票',
  online: '线上支付',
}

// ===== 收款跟进(三色前置判断)=====
export const followUpSuggestionMap: Record<FollowUpSuggestion, StatusMeta> = {
  collect: { label: '建议跟进', className: emerald },
  hold: { label: '暂缓跟进', className: amber },
  pending: { label: '暂不跟进', className: zinc },
}

export const followUpStatusMap: Record<'active' | 'resolved', StatusMeta> = {
  active: { label: '跟进中', className: amber },
  resolved: { label: '已解决', className: emerald },
}

// ===== 维保 =====
export const maintenanceCategoryMap: Record<MaintenanceCategory, StatusMeta> = {
  fire: { label: '消防维保', className: red },
  elevator: { label: '电梯维保', className: indigo },
  daily: { label: '日常维保', className: blue },
}

/** 维保派生状态:已执行 / 计划内待执行 / 超期未执行 */
export const maintenanceStatusMap: Record<'done' | 'pending' | 'overdue', StatusMeta> = {
  done: { label: '已完成', className: emerald },
  pending: { label: '待执行', className: blue },
  overdue: { label: '超期未执行', className: red },
}

// ===== 巡检 =====
export const inspectionTemplateMap: Record<InspectionTemplateKey, StatusMeta> = {
  security: { label: '安防巡检', className: indigo },
  fire: { label: '消防巡检', className: red },
  cleaning: { label: '保洁巡检', className: sky },
  equipment: { label: '设备巡检', className: blue },
}

/** 巡检派生状态:合格 / 存在异常项 / 待巡检 / 超期未巡检 */
export const inspectionStatusMap: Record<'pass' | 'abnormal' | 'pending' | 'overdue', StatusMeta> = {
  pass: { label: '合格', className: emerald },
  abnormal: { label: '异常', className: red },
  pending: { label: '待巡检', className: blue },
  overdue: { label: '超期未巡检', className: amber },
}

// ===== 任务清单 =====
export const taskLevelMap: Record<TaskLevel, string> = {
  year: '年度',
  quarter: '季度',
  month: '月度',
  week: '周',
}

/** 任务派生状态:已完成 / 进行中 / 已逾期(open 且过 dueAt) */
export const taskStatusMap: Record<'done' | 'open' | 'overdue', StatusMeta> = {
  done: { label: '已完成', className: emerald },
  open: { label: '进行中', className: blue },
  overdue: { label: '已逾期', className: red },
}

// ===== 通知 =====
export const noticeTypeMap: Record<NoticeType, StatusMeta> = {
  public_repair: { label: '公共区域维修', className: indigo },
  water_outage: { label: '停水通知', className: sky },
  power_outage: { label: '停电通知', className: amber },
  general: { label: '一般公告', className: blue },
}

export const noticeStatusMap: Record<NoticeStatus, StatusMeta> = {
  active: { label: '生效中', className: emerald },
  expired: { label: '已过期', className: zinc },
  revoked: { label: '已撤销', className: red },
}

// ===== 调研 =====
export const surveyStatusMap: Record<'active' | 'closed', StatusMeta> = {
  active: { label: '进行中', className: blue },
  closed: { label: '已结束', className: zinc },
}

// ===== 智能门锁 =====
export const lockKindMap: Record<LockKind, StatusMeta> = {
  unit: { label: '单元门', className: blue },
  building_gate: { label: '楼栋大门', className: indigo },
  public: { label: '公共区域', className: violet },
}

export const lockOnlineMap: Record<'online' | 'offline', StatusMeta> = {
  online: { label: '在线', className: emerald },
  offline: { label: '离线', className: red },
}

/** 单元锁分配状态(大门/公共锁不适用) */
export const lockAssignedMap: Record<'assigned' | 'vacant', StatusMeta> = {
  assigned: { label: '使用中', className: emerald },
  vacant: { label: '空置', className: zinc },
}

export const passcodeKindMap: Record<PasscodeKind, StatusMeta> = {
  random: { label: '随机密码', className: sky },
  custom: { label: '自定义密码', className: blue },
}

export const passcodeTypeMap: Record<PasscodeType, string> = {
  once: '单次',
  period: '限期',
  permanent: '永久',
  cycle_daily: '每日循环',
  cycle_weekday: '工作日循环',
  cycle_weekend: '周末循环',
}

export const passcodePurposeMap: Record<PasscodePurpose, string> = {
  staff: '员工',
  visitor: '访客',
  cleaning: '保洁',
  other: '其他',
}

export const passcodeStatusMap: Record<PasscodeStatus, StatusMeta> = {
  active: { label: '生效中', className: emerald },
  pending: { label: '未生效', className: blue },
  disabled: { label: '已禁用', className: amber },
  expired: { label: '已过期', className: zinc },
  deleted: { label: '已删除', className: red },
}

export const unlockMethodMap: Record<UnlockMethod, StatusMeta> = {
  remote: { label: '远程开锁', className: indigo },
  passcode: { label: '密码开锁', className: blue },
  app_ble: { label: '蓝牙开锁', className: sky },
  ic_card: { label: 'IC 卡', className: violet },
  fingerprint: { label: '指纹', className: emerald },
}

// ===== 部门 =====
export const deptMap: Record<DeptCode, string> = {
  engineering: '工程部',
  customer_service: '客服部',
  security: '秩序部',
  cleaning: '保洁部',
  management: '综合管理部',
}
