import { mulberry32 } from '../../lib/prng'
import type { AppData } from '../types'
import { ACCOUNTS, BUILDINGS, PARK, STAFF, ZONES } from './constants'
import {
  assignComplaintIds,
  assignWorkOrderIds,
  buildCompanies,
  buildCsAssignments,
  buildParkingPlans,
  buildVaContracts,
  genBills,
  genFillerComplaints,
  genFillerWorkOrders,
  genInspections,
  genInvoices,
  genMaintenance,
  genMeterReadings,
  genSurveys,
  genTargets,
  genWorkTasks,
} from './generators'
import { genLockData } from './locks'
import {
  buildStoryComplaints,
  buildStoryFollowUps,
  buildStoryNotices,
  buildStoryWorkOrders,
  WAIVER_DEFS,
} from './storyCompanies'
import { STORY_COMPANY_IDS } from './constants'

/**
 * 组装完整初始数据。固定种子 → 每次构建结果完全一致;
 * 刷新页面即重置(演示可反复进行)。
 */
export function buildSeedData(): AppData {
  const rng = mulberry32(20260606)

  // 1. 企业与车位、客服分配、增值合同
  const companies = buildCompanies(rng)
  const parkingPlans = buildParkingPlans(rng)
  const csAssignments = buildCsAssignments(companies)
  const valueAddedContracts = buildVaContracts()

  // 2. 减免 → 12 个月四费类账单(账单存减免后净额)→ 收费目标
  const waivers = [...WAIVER_DEFS]
  const { bills } = genBills(companies, parkingPlans, valueAddedContracts, waivers, rng)
  const revenueTargets = genTargets(bills, rng)

  // 3. 工单(故事 + filler)→ 按报修日期统一编号
  const storyWos = buildStoryWorkOrders(companies, rng)
  const fillerWos = genFillerWorkOrders(companies, rng, new Set(Object.values(STORY_COMPANY_IDS)))
  const workOrders = assignWorkOrderIds([...Object.values(storyWos), ...fillerWos])

  // 4. 投诉(故事投诉引用已编号的工单 id)
  const complaints = assignComplaintIds([
    ...buildStoryComplaints(companies, storyWos),
    ...genFillerComplaints(companies, rng, new Set(Object.values(STORY_COMPANY_IDS))),
  ])

  // 5. 维保 / 巡检 / 核抄 / 任务(内控与服务品质)
  const maintenanceOrders = genMaintenance(rng)
  const inspections = genInspections(rng)
  const meterReadings = genMeterReadings(rng)
  const workTasks = genWorkTasks()

  // 6. 调研 / 发票 / 通知 / 收款跟进历史
  const { surveys, responses: surveyResponses } = genSurveys(companies, rng)
  const invoices = genInvoices(companies, bills, rng)
  const notices = buildStoryNotices(storyWos.plazaRepair.id)
  const followUpRecords = buildStoryFollowUps()

  // 7. 智能门锁:锁资产/分配(含迁出企业历史)/密码/通行记录/客服管辖
  const lockData = genLockData(companies, rng)

  return {
    park: PARK,
    zones: ZONES,
    buildings: BUILDINGS,
    companies,
    staff: STAFF,
    accounts: ACCOUNTS,
    csAssignments,
    bills,
    waivers,
    revenueTargets,
    valueAddedContracts,
    workOrders,
    complaints,
    maintenanceOrders,
    inspections,
    meterReadings,
    workTasks,
    notices,
    invoices,
    surveys,
    surveyResponses,
    followUpRecords,
    ...lockData,
  }
}
