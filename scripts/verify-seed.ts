// M1 数据层验收脚本:npx tsx scripts/verify-seed.ts
import { buildSeedData } from '../src/data/seed'
import { getCollectionTrend, getMonthCollection, getArrears, getBillStatus, getVacancyRate } from '../src/data/selectors/billingSelectors'
import { getDunningRows, getDunningSuggestion } from '../src/data/selectors/dunningSelectors'
import { getRiskList, getSatisfactionDist, getWorkOrderStatusDist } from '../src/data/selectors/dashboardSelectors'
import { getComplaintSatisfactionRate, isRepeatComplainer } from '../src/data/selectors/complaintSelectors'
import { getOpenOverdueWorkOrders, getRepairOnTimeRate, deriveWorkOrderStatus } from '../src/data/selectors/workOrderSelectors'
import { STORY_IDS } from '../src/data/seed/storyHouseholds'
import { CURRENT_MONTH } from '../src/lib/date'

const data = buildSeedData()
const pct = (x: number) => `${(x * 100).toFixed(1)}%`

console.log('=== 实体数量 ===')
console.log({
  communities: data.communities.length,
  buildings: data.buildings.length,
  units: data.units.length,
  households: data.households.length,
  bills: data.bills.length,
  workOrders: data.workOrders.length,
  complaints: data.complaints.length,
  dunningRecords: data.dunningRecords.length,
  serviceTasks: data.serviceTasks.length,
})

console.log('\n=== 当月收缴 ===')
const june = getMonthCollection(data, CURRENT_MONTH)
console.log(`应收 ${june.receivable} 实收 ${june.received} 收缴率 ${pct(june.rate)} (目标≈88%)`)

console.log('\n=== 近6个月趋势 ===')
for (const t of getCollectionTrend(data, 6)) console.log(`${t.month}: ${pct(t.rate)}`)

console.log('\n=== 故事户催缴建议 ===')
const expect: Record<string, string> = {
  zhangwei: 'collect',
  liqiang: 'hold',
  wangxiulan: 'verify',
  zhoujie: 'collect',
}
for (const [key, hid] of Object.entries(STORY_IDS)) {
  const arrears = getArrears(data, hid)
  if (arrears.amount === 0) {
    console.log(`${key}(${hid}): 无欠费`)
    continue
  }
  const sugg = getDunningSuggestion(data, hid)
  const want = expect[key]
  console.log(
    `${key}(${hid}): ${sugg}${want ? (sugg === want ? ' ✓' : ` ✗ 期望 ${want}`) : ''} 欠 ${arrears.amount} 元 / ${arrears.months} 个月`,
  )
}

console.log('\n=== 工单 ===')
const overdue = getOpenOverdueWorkOrders(data)
console.log(`超时未完工: ${overdue.length} 个(期望 3)`, overdue.map((w) => `${w.id}@${w.householdId}`))
console.log('状态分布:', getWorkOrderStatusDist(data))
console.log(`维修及时率: ${pct(getRepairOnTimeRate(data))}`)
console.log('满意度分布:', getSatisfactionDist(data))
console.log('张伟工单:', data.workOrders.filter((w) => w.householdId === STORY_IDS.zhangwei).map((w) => `${w.id}:${deriveWorkOrderStatus(w)}`))

console.log('\n=== 投诉 ===')
console.log(`投诉满意率: ${pct(getComplaintSatisfactionRate(data))}`)
console.log(`孙丽反复投诉: ${isRepeatComplainer(data, STORY_IDS.sunli)} (期望 true)`)

console.log('\n=== 催缴列表 ===')
for (const row of getDunningRows(data)) {
  console.log(
    `${row.household.householdNo} ${row.household.ownerName} 欠${row.arrears.amount}元/${row.arrears.months}月 → ${row.suggestion}${row.activeRecord ? ` [催缴中${row.isReported ? '·已上报' : ''}]` : ''}`,
  )
}

console.log('\n=== 其他 ===')
console.log(`空置率: ${pct(getVacancyRate(data))} (期望 ~3.6%)`)
console.log(`吴静当月物业费状态: ${getBillStatus(data.bills.find((b) => b.householdId === STORY_IDS.wujing && b.month === CURRENT_MONTH && b.feeType === 'property')!)} (期望 partial)`)
console.log(`王秀兰水电账单数: ${data.bills.filter((b) => b.householdId === STORY_IDS.wangxiulan && b.feeType !== 'property').length} (期望 0)`)
console.log(`赵敏半价账单数: ${data.bills.filter((b) => b.householdId === STORY_IDS.zhaomin && b.isHalfPrice).length} (期望 7:2025-12~2026-06)`)

console.log('\n=== 风险清单 ===')
for (const r of getRiskList(data)) console.log(`[${r.level}] ${r.text} → ${r.link}`)
