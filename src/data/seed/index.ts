import { mulberry32 } from '../../lib/prng'
import type { AppData } from '../types'
import { ACCOUNTS, STAFF } from './constants'
import {
  assignComplaintIds,
  assignWorkOrderIds,
  buildProfiles,
  buildServiceTasks,
  genBills,
  genFillerComplaints,
  genFillerWorkOrders,
  genSpaces,
  markFillerVacants,
} from './generators'
import {
  applyStoryIdentities,
  buildStoryComplaints,
  buildStoryDunningRecords,
  buildStoryResidents,
  buildStoryWorkOrders,
  STORY_ID_SET,
  storyPayProfiles,
} from './storyHouseholds'

/**
 * 组装完整初始数据。固定种子 → 每次构建结果完全一致;
 * 刷新页面即重置(演示可反复进行)。
 */
export function buildSeedData(): AppData {
  const rng = mulberry32(20260606)

  // 1. 空间结构 + 户(含随机业主身份)
  const { communities, buildings, units, households, parkingMap } = genSpaces(rng)

  // 2. 故事户身份与状态覆写、filler 空置户
  applyStoryIdentities(households, parkingMap)
  markFillerVacants(households, rng, STORY_ID_SET)

  // 3. 缴费画像 → 12 个月账单
  const { profiles, arrearsFillerIds } = buildProfiles(households, rng, storyPayProfiles(), STORY_ID_SET)
  const bills = genBills(households, profiles, parkingMap, rng)

  // 4. 工单(故事 + filler)→ 按报修日期统一编号
  const storyWos = buildStoryWorkOrders()
  const fillerWos = genFillerWorkOrders(households, rng, STORY_ID_SET, arrearsFillerIds)
  const workOrders = assignWorkOrderIds([...Object.values(storyWos), ...fillerWos])

  // 5. 投诉(故事投诉引用已编号的工单 id)
  const complaints = assignComplaintIds([
    ...buildStoryComplaints(storyWos),
    ...genFillerComplaints(households, rng, STORY_ID_SET, arrearsFillerIds),
  ])

  // 6. 催缴记录、空置待办、业主账号实体
  const dunningRecords = buildStoryDunningRecords(bills)
  const serviceTasks = buildServiceTasks(households)
  const residents = buildStoryResidents()

  return {
    communities,
    buildings,
    units,
    households,
    residents,
    staff: STAFF,
    accounts: ACCOUNTS,
    bills,
    workOrders,
    complaints,
    dunningRecords,
    serviceTasks,
  }
}
