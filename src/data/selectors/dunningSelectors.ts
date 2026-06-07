import type { AppData, DunningRecord, DunningSuggestion, Household } from '../types'
import { getArrears, getHouseholdsWithArrears, type Arrears } from './billingSelectors'
import { getHouseholdComplaints, isComplaintOpen } from './complaintSelectors'
import { getHouseholdWorkOrders, isWorkOrderOverdue } from './workOrderSelectors'

// ============================================================
// 催缴前置判断 —— 产品核心卖点。
// 规则优先级(短路,仅对有欠费的户调用):
//   1. 户存在数据异常(疑似空置未登记/数据错误)→ verify 数据待核实
//   2. 存在未闭环投诉 或 超时未完工工单 → hold 暂缓催缴(先解决服务,再催费)
//   3. 其余 → collect 建议催缴(服务到位仍欠费 = 无理由拖欠)
// 实时派生不落库:解决投诉/完结超时工单后,建议立即从 hold 变 collect。
// ============================================================

type DunningData = Pick<AppData, 'bills' | 'households' | 'workOrders' | 'complaints'>

export function getDunningSuggestion(data: DunningData, householdId: string): DunningSuggestion {
  const household = data.households.find((h) => h.id === householdId)
  if (household?.anomaly) return 'verify'
  const openComplaints = getHouseholdComplaints(data, householdId).filter(isComplaintOpen)
  const overdueWos = getHouseholdWorkOrders(data, householdId).filter((wo) => isWorkOrderOverdue(wo))
  if (openComplaints.length > 0 || overdueWos.length > 0) return 'hold'
  return 'collect'
}

export interface DunningReason {
  hit: boolean
  text: string
}

/** 逐条规则的命中/未命中说明,供「判断依据」卡渲染 */
export function getSuggestionReasons(data: DunningData, householdId: string): DunningReason[] {
  const household = data.households.find((h) => h.id === householdId)
  const arrears = getArrears(data, householdId)
  const openComplaints = getHouseholdComplaints(data, householdId).filter(isComplaintOpen)
  const overdueWos = getHouseholdWorkOrders(data, householdId).filter((wo) => isWorkOrderOverdue(wo))

  const reasons: DunningReason[] = []
  reasons.push(
    household?.anomaly
      ? {
          hit: true,
          text: `连续 ${arrears.months} 个月欠费且长期无水电用量记录,疑似空置未登记或数据错误,建议先核实再催缴`,
        }
      : { hit: false, text: '无空置 / 数据异常迹象' },
  )
  reasons.push(
    openComplaints.length > 0
      ? { hit: true, text: `存在 ${openComplaints.length} 条未闭环投诉(${openComplaints.map((c) => c.id).join('、')}),业主可能因服务问题拒交` }
      : { hit: false, text: '无未闭环投诉' },
  )
  reasons.push(
    overdueWos.length > 0
      ? { hit: true, text: `存在 ${overdueWos.length} 个超时未完工工单(${overdueWos.map((w) => w.id).join('、')}),应先解决维修问题` }
      : { hit: false, text: '维修服务及时,无超时未完工工单' },
  )
  return reasons
}

export interface DunningRow {
  household: Household
  arrears: Arrears
  suggestion: DunningSuggestion
  /** 进行中的催缴记录(若有) */
  activeRecord?: DunningRecord
  isReported: boolean
}

type DunningRowData = DunningData & Pick<AppData, 'dunningRecords'>

/** 催缴页主列表:全部欠费户 + 三色建议 + 催缴状态 */
export function getDunningRows(data: DunningRowData): DunningRow[] {
  return getHouseholdsWithArrears(data).map(({ household, arrears }) => {
    const activeRecord = data.dunningRecords.find(
      (r) => r.householdId === household.id && r.status === 'active',
    )
    return {
      household,
      arrears,
      suggestion: getDunningSuggestion(data, household.id),
      activeRecord,
      isReported: activeRecord?.isReported ?? false,
    }
  })
}

export function getActiveDunningForHousehold(
  data: Pick<AppData, 'dunningRecords'>,
  householdId: string,
): DunningRecord | undefined {
  return data.dunningRecords.find((r) => r.householdId === householdId && r.status === 'active')
}
