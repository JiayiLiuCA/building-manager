import type { AppData, Bill, CurrentUser, WorkOrder } from '../types'

// ============================================================
// 权限唯一入口:所有「与企业相关」的数据读取必须先经这里过滤。
// - visibleCompanyIds:主管 → 全部;客服 → 管辖名单;企业 → 自己
// - getScopedData:返回与 AppData 同形状的视图(企业相关数组已过滤)
// - getScopedInternal:内控数据(巡检/核抄/任务)按 ownerUsername 归属;
//   维保为园区公共工作,物业角色全量可见;企业端一律不可见
// 页面纪律:禁止直接读 state.bills 等原始数组,一律走本文件。
// ============================================================

export interface SessionSlice {
  currentUser: CurrentUser | null
}

export type ScopedState = AppData & SessionSlice

export function visibleCompanyIds(state: ScopedState): Set<string> {
  const user = state.currentUser
  if (!user) return new Set()
  if (user.role === 'supervisor') return new Set(state.companies.map((c) => c.id))
  if (user.role === 'cs') {
    const assignment = state.csAssignments.find((a) => a.csUsername === user.username)
    return new Set(assignment?.companyIds ?? [])
  }
  return new Set(user.companyId ? [user.companyId] : [])
}

/** 公共区域工单:物业角色(主管/客服)可见,企业端不可见 */
function isPropertyRole(user: CurrentUser | null): boolean {
  return user?.role === 'supervisor' || user?.role === 'cs'
}

export function getScopedData(state: ScopedState): ScopedState {
  const ids = visibleCompanyIds(state)
  const propertyRole = isPropertyRole(state.currentUser)
  // 园区级账单(无 companyId,仅临停)只归主管:保证「客服的每一个财务数字 = 名下企业聚合」可加性
  const keepBill = (b: Bill) => (b.companyId ? ids.has(b.companyId) : state.currentUser?.role === 'supervisor')
  const keepWo = (w: WorkOrder) => (w.kind === 'company' ? !!w.companyId && ids.has(w.companyId) : propertyRole)
  return {
    ...state,
    companies: state.companies.filter((c) => ids.has(c.id)),
    bills: state.bills.filter(keepBill),
    waivers: state.waivers.filter((w) => ids.has(w.companyId)),
    valueAddedContracts: state.valueAddedContracts.filter((c) => ids.has(c.companyId)),
    workOrders: state.workOrders.filter(keepWo),
    complaints: state.complaints.filter((c) => ids.has(c.companyId)),
    invoices: state.invoices.filter((i) => ids.has(i.companyId)),
    followUpRecords: state.followUpRecords.filter((r) => ids.has(r.companyId)),
    surveyResponses: state.surveyResponses.filter((r) => ids.has(r.companyId)),
  }
}

export interface ScopedInternal {
  maintenanceOrders: AppData['maintenanceOrders']
  inspections: AppData['inspections']
  meterReadings: AppData['meterReadings']
  workTasks: AppData['workTasks']
}

export function getScopedInternal(state: ScopedState): ScopedInternal {
  const user = state.currentUser
  if (!user || user.role === 'company') {
    return { maintenanceOrders: [], inspections: [], meterReadings: [], workTasks: [] }
  }
  if (user.role === 'supervisor') {
    return {
      maintenanceOrders: state.maintenanceOrders,
      inspections: state.inspections,
      meterReadings: state.meterReadings,
      workTasks: state.workTasks,
    }
  }
  const own = <T extends { ownerUsername: string }>(list: T[]) => list.filter((x) => x.ownerUsername === user.username)
  return {
    maintenanceOrders: state.maintenanceOrders, // 维保为园区公共工作,客服全量可见
    inspections: own(state.inspections),
    meterReadings: own(state.meterReadings),
    workTasks: own(state.workTasks),
  }
}

export interface NoticeScopeOptions {
  /** 仅主管可发全园区通知 */
  canPark: boolean
  zoneIds: string[]
  buildingIds: string[]
  companyIds: string[]
}

/** 发布通知可选的影响范围:客服只能选自己管辖的企业及其所在区/楼栋 */
export function getNoticeScopeOptions(state: ScopedState): NoticeScopeOptions {
  const user = state.currentUser
  if (user?.role === 'supervisor') {
    return {
      canPark: true,
      zoneIds: state.zones.map((z) => z.id),
      buildingIds: state.buildings.map((b) => b.id),
      companyIds: state.companies.map((c) => c.id),
    }
  }
  const ids = visibleCompanyIds(state)
  const companies = state.companies.filter((c) => ids.has(c.id))
  return {
    canPark: false,
    zoneIds: [...new Set(companies.map((c) => c.zoneId))],
    buildingIds: [...new Set(companies.map((c) => c.buildingId))],
    companyIds: companies.map((c) => c.id),
  }
}
