import type {
  BillStatus,
  ComplaintEventType,
  ComplaintStatus,
  DeptCode,
  DunningSuggestion,
  FeeType,
  WorkOrderCategory,
  WorkOrderEventType,
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

export const workOrderStatusMap: Record<WorkOrderStatus, StatusMeta> = {
  pending: { label: '待接单', className: amber },
  accepted: { label: '已接单', className: sky },
  dispatched: { label: '已派单', className: blue },
  in_progress: { label: '处理中', className: indigo },
  done_pending_sign: { label: '已完成待签字', className: violet },
  closed: { label: '已关单', className: emerald },
}

export const complaintStatusMap: Record<ComplaintStatus, StatusMeta> = {
  pending: { label: '待处理', className: amber },
  processing: { label: '处理中', className: blue },
  replied: { label: '已回复', className: violet },
  supervisor: { label: '主管介入中', className: red },
  closed: { label: '已关闭', className: emerald },
}

export const billStatusMap: Record<BillStatus, StatusMeta> = {
  paid: { label: '已缴', className: emerald },
  unpaid: { label: '未缴', className: red },
  partial: { label: '部分缴纳', className: amber },
}

export const dunningSuggestionMap: Record<DunningSuggestion, StatusMeta> = {
  collect: { label: '建议催缴', className: emerald },
  hold: { label: '暂缓催缴', className: amber },
  verify: { label: '数据待核实', className: zinc },
}

export const feeTypeMap: Record<FeeType, StatusMeta> = {
  property: { label: '物业费', className: blue },
  water: { label: '水费', className: sky },
  electricity: { label: '电费', className: amber },
  parking: { label: '车位费', className: violet },
}

export const workOrderCategoryMap: Record<WorkOrderCategory, string> = {
  plumbing: '水暖管道',
  electrical: '电路电气',
  door_window: '门窗五金',
  public_area: '公共区域',
  other: '其他',
}

export const deptMap: Record<DeptCode, string> = {
  engineering: '工程部',
  customer_service: '客服部',
  security: '秩序部',
  cleaning: '保洁部',
  management: '综合管理部',
}

/** 工单时间线节点文案 */
export const workOrderEventMap: Record<WorkOrderEventType, string> = {
  REPORTED: '业主报修',
  ACCEPTED: '物业接单',
  DISPATCHED: '派单',
  APPOINTMENT_SET: '预约上门',
  COMPLETED: '完工提交',
  SIGNED: '业主电子签字',
  CLOSED: '关单',
  RATED: '业主评价',
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

export const serviceTaskTypeMap: Record<'CUT_UTILITIES' | 'RESTORE_UTILITIES', string> = {
  CUT_UTILITIES: '停水停电',
  RESTORE_UTILITIES: '恢复水电',
}
