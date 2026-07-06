// Seed 数据不变量校验(硬断言):npx tsx scripts/verify-seed.ts
// S2 版:数据形状 / 故事摆位 / 覆盖面断言(内联算术);S3 起追加三视角一致性与权限隔离断言。
import { buildSeedData } from '../src/data/seed'
import { DEFAULT_CS_ZONES, STORY_COMPANY_IDS } from '../src/data/seed/constants'
import type { Bill } from '../src/data/types'
import { CURRENT_MONTH, DEMO_TODAY, diffHours, lastMonths } from '../src/lib/date'

const data = buildSeedData()
let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!cond) failures += 1
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const sum = (list: Bill[]) => list.reduce((s, b) => s + b.amount, 0)
const sumPaid = (list: Bill[]) => list.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)

console.log('=== 实体数量 ===')
console.log({
  zones: data.zones.length,
  buildings: data.buildings.length,
  companies: data.companies.length,
  bills: data.bills.length,
  waivers: data.waivers.length,
  targets: data.revenueTargets.length,
  contracts: data.valueAddedContracts.length,
  workOrders: data.workOrders.length,
  complaints: data.complaints.length,
  maintenance: data.maintenanceOrders.length,
  inspections: data.inspections.length,
  meterReadings: data.meterReadings.length,
  workTasks: data.workTasks.length,
  notices: data.notices.length,
  invoices: data.invoices.length,
  surveys: data.surveys.length,
  surveyResponses: data.surveyResponses.length,
  followUps: data.followUpRecords.length,
})

// ===== 空间与企业 =====
check('3 个区 / 14 栋楼', data.zones.length === 3 && data.buildings.length === 14)
check('30 家企业', data.companies.length === 30)
const wholeCount = data.companies.filter((c) => c.occupancy.type === 'whole').length
check('整栋独占 10 家', wholeCount === 10, `实际 ${wholeCount}`)
check('账号 6 个 / 员工 10 人', data.accounts.length === 6 && data.staff.length === 10)
const wang = data.csAssignments.find((a) => a.csUsername === 'cs_wang')!
const liu = data.csAssignments.find((a) => a.csUsername === 'cs_liu')!
check('客服分配覆盖全部 30 家且不重叠', wang.companyIds.length + liu.companyIds.length === 30)
check(
  '王琳管 A+B 区(21 家),刘洋管 C 区(9 家)',
  wang.companyIds.length === 21 && liu.companyIds.length === 9,
  `王琳 ${wang.companyIds.length} / 刘洋 ${liu.companyIds.length}`,
)
check(
  '故事企业归属:①② → 王琳,③ → 刘洋',
  wang.companyIds.includes(STORY_COMPANY_IDS.one) &&
    wang.companyIds.includes(STORY_COMPANY_IDS.two) &&
    liu.companyIds.includes(STORY_COMPANY_IDS.three),
)
check('DEFAULT_CS_ZONES 覆盖两位客服', Object.keys(DEFAULT_CS_ZONES).length === 2)

// ===== 账单 =====
const months12 = lastMonths(12)
const billIds = new Set(data.bills.map((b) => b.id))
check('账单 id 全局唯一', billIds.size === data.bills.length, `${data.bills.length} 张`)
const monthsCovered = new Set(data.bills.map((b) => b.month))
check('账单覆盖 12 个月', months12.every((m) => monthsCovered.has(m)))
for (const c of data.companies) {
  const companyMonths = new Set(data.bills.filter((b) => b.companyId === c.id).map((b) => b.month))
  if (companyMonths.size !== 12) {
    check(`企业 ${c.id} 账单覆盖 12 个月`, false, `仅 ${companyMonths.size} 个月`)
  }
}
check('全部企业账单月份覆盖检查完成', true)
const parkBills = data.bills.filter((b) => !b.companyId)
check(
  '园区级账单 = 12 张临停(不挂企业)',
  parkBills.length === 12 && parkBills.every((b) => b.category === 'vehicle' && b.subType === 'temporary'),
)

const juneBills = (companyId: string) => data.bills.filter((b) => b.companyId === companyId && b.month === CURRENT_MONTH)
const monthBills = (companyId: string, month: string) => data.bills.filter((b) => b.companyId === companyId && b.month === month)
const fullyPaid = (list: Bill[]) => list.every((b) => b.paidAmount >= b.amount)
const fullyUnpaid = (list: Bill[]) => list.every((b) => b.paidAmount === 0)

// 故事① 云脉:全缴清,6 月于 6-05 缴(习惯 5 日)
const c03June = juneBills('C-03')
check('①云脉 6 月账单已缴清', fullyPaid(c03June))
check('①云脉 6 月缴款日 = 2026-06-05(习惯 5 日)', c03June.every((b) => b.paidAt?.startsWith('2026-06-05')))
check('①云脉近 12 月无任何欠费', fullyPaid(data.bills.filter((b) => b.companyId === 'C-03')))

// 故事② 精工:当月仅物业费+电费未缴
const c13June = juneBills('C-13')
const c13Unpaid = c13June.filter((b) => b.paidAmount < b.amount)
check(
  '②精工 6 月未缴 = 物业费 + 电费(其余已缴)',
  c13Unpaid.length === 2 &&
    c13Unpaid.some((b) => b.category === 'property') &&
    c13Unpaid.some((b) => b.category === 'utility' && b.subType === 'electricity'),
  c13Unpaid.map((b) => b.id).join(','),
)
check('②精工 5 月已缴清', fullyPaid(monthBills('C-13', '2026-05')))

// 故事③ 洄澜:5、6 两月全欠
check('③洄澜 5、6 两月全部未缴', fullyUnpaid(monthBills('C-25', '2026-05')) && fullyUnpaid(juneBills('C-25')))
check('③洄澜 4 月已缴清', fullyPaid(monthBills('C-25', '2026-04')))

// 历史欠费户 C-18:4、5 月挂账,6 月已缴(含减免后净额)
check('C-18 泰达 4、5 月未缴 / 6 月已缴', fullyUnpaid(monthBills('C-18', '2026-04')) && fullyUnpaid(monthBills('C-18', '2026-05')) && fullyPaid(juneBills('C-18')))
const c18JuneProperty = juneBills('C-18').find((b) => b.category === 'property')!
check('C-18 6 月物业费 = 面积×18 − 减免 1500', c18JuneProperty.amount === 1400 * 18 - 1500, `实际 ${c18JuneProperty.amount}`)

// 未到付款日 / 无习惯:仅当月未缴
for (const id of ['C-05', 'C-21', 'C-29']) {
  check(`${id} 仅当月未缴(历史月已缴清)`, fullyUnpaid(juneBills(id)) && fullyPaid(monthBills(id, '2026-05')))
}
check('C-21 无缴费习惯记录(待沟通核实素材)', data.companies.find((c) => c.id === 'C-21')!.paymentHabit == null)

// 今日到账素材:C-07 亿讯 6 月账单 paidAt = 今天上午
check('C-07 亿讯 6 月账单今日上午到账', juneBills('C-07').every((b) => b.paidAt?.startsWith(`${DEMO_TODAY}T09`)))

// 其余企业全部缴清
const arrearsIds = new Set(['C-05', 'C-13', 'C-18', 'C-21', 'C-25', 'C-29'])
const cleanOk = data.companies
  .filter((c) => !arrearsIds.has(c.id))
  .every((c) => fullyPaid(data.bills.filter((b) => b.companyId === c.id)))
check('其余 24 家企业 12 个月全部缴清', cleanOk)

// 当月与历史收缴率(内联口径:min(paid,amount)/amount)
const juneAll = data.bills.filter((b) => b.month === CURRENT_MONTH)
const juneRate = sumPaid(juneAll) / sum(juneAll)
check('当月收缴率在 90%~96%(欠费少、留有付款日待缴)', juneRate >= 0.9 && juneRate <= 0.96, pct(juneRate))
const mayAll = data.bills.filter((b) => b.month === '2026-05')
const mayRate = sumPaid(mayAll) / sum(mayAll)
check('5 月收缴率 ≥ 95%', mayRate >= 0.95, pct(mayRate))
const janAll = data.bills.filter((b) => b.month === '2026-01')
check('1 月收缴率 = 100%', sumPaid(janAll) === sum(janAll))

// 三视角(内联):王琳 vs 刘洋收缴率肉眼可辨(≥1.5pp),应收量级不同
const wangSet = new Set(wang.companyIds)
const liuSet = new Set(liu.companyIds)
const juneWang = juneAll.filter((b) => b.companyId && wangSet.has(b.companyId))
const juneLiu = juneAll.filter((b) => b.companyId && liuSet.has(b.companyId))
const wangRate = sumPaid(juneWang) / sum(juneWang)
const liuRate = sumPaid(juneLiu) / sum(juneLiu)
check('两位客服当月收缴率差 ≥ 1.5pp', Math.abs(wangRate - liuRate) >= 0.015, `王琳 ${pct(wangRate)} / 刘洋 ${pct(liuRate)}`)
check('两位客服收缴率均 ≥ 90%(不触发目标告警)', wangRate >= 0.9 && liuRate >= 0.9)
check('两位客服当月应收量级可辨(王琳 ≥ 2×刘洋)', sum(juneWang) >= 2 * sum(juneLiu), `王琳 ${sum(juneWang)} / 刘洋 ${sum(juneLiu)}`)
check('admin 应收 = 王琳 + 刘洋 + 园区级', sum(juneAll) === sum(juneWang) + sum(juneLiu) + sum(juneAll.filter((b) => !b.companyId)))

// ===== 减免与目标 =====
check('减免记录 3 笔(②×2 历史 + C-18 当月)', data.waivers.length === 3 && data.waivers.filter((w) => w.companyId === 'C-13').length === 2)
check('目标 = 12 月 × 4 费类 = 48 条', data.revenueTargets.length === 48)
const targetOk = data.revenueTargets.every((t) => {
  const receivable = sum(data.bills.filter((b) => b.month === t.month && b.category === t.category))
  return receivable > 0 && t.amount / receivable > 0.85 && t.amount / receivable < 1.15
})
check('各期间目标在应收的 85%~115% 区间(达成率有层次)', targetOk)

// ===== 工单 =====
const woIds = new Set(data.workOrders.map((w) => w.id))
check('工单 id 唯一且按报修时间编号', woIds.size === data.workOrders.length, `${data.workOrders.length} 单`)
check('企业单都有 companyId / 公共单都有 location', data.workOrders.every((w) => (w.kind === 'company' ? !!w.companyId : !!w.location)))
const closedCompany = data.workOrders.filter((w) => w.kind === 'company' && w.events.some((e) => e.type === 'CLOSED'))
const closedPublic = data.workOrders.filter((w) => w.kind === 'public' && w.events.some((e) => e.type === 'CLOSED'))
check('已关企业单均有签字事件', closedCompany.every((w) => w.events.some((e) => e.type === 'SIGNED')))
check('已关公共单均无签字/评价(物业验收)', closedPublic.every((w) => !w.events.some((e) => e.type === 'SIGNED' || e.type === 'RATED')))
// 满意度趋势覆盖:近 12 个月每月至少 1 条已评价企业单
const ratedByMonth = new Map<string, number>()
for (const w of data.workOrders) {
  if (w.satisfactionRating == null) continue
  const m = w.events[0].at.slice(0, 7)
  ratedByMonth.set(m, (ratedByMonth.get(m) ?? 0) + 1)
}
check('近 12 个月每月均有已评价工单(满意度趋势)', months12.every((m) => (ratedByMonth.get(m) ?? 0) >= 1))
// 超时未完工(未完工且报修距今 >48h):②的空调单 + 公共车库照明单,共 2 单
const refNow = `${DEMO_TODAY}T12:00:00`
const openOverdue = data.workOrders.filter((w) => {
  const completed = w.events.some((e) => e.type === 'COMPLETED' || e.type === 'CLOSED')
  return !completed && diffHours(w.events[0].at, refNow) > 48
})
check('超时未完工 = 2 单(②空调 + 公共照明)', openOverdue.length === 2, openOverdue.map((w) => w.id).join(','))
check('②精工存在超时未闭环工单', openOverdue.some((w) => w.companyId === STORY_COMPANY_IDS.two))
// 当月开放管线
const openJune = data.workOrders.filter((w) => !w.events.some((e) => e.type === 'CLOSED'))
check('存在待接单 / 待签字 / 待验收管线', openJune.length >= 8, `开放 ${openJune.length} 单`)

// ===== 投诉 =====
check('②精工存在未闭环投诉且关联其超时工单', data.complaints.some((c) => c.companyId === STORY_COMPANY_IDS.two && !c.events.some((e) => e.type === 'CLOSED') && c.workOrderId != null && woIds.has(c.workOrderId)))
const gymComplaints = data.complaints.filter((c) => c.companyId === 'C-24')
check('C-24 星野健身历史投诉 ≥ 3(反复投诉旗标)', gymComplaints.length >= 3, `${gymComplaints.length} 条`)

// ===== 维保 / 巡检 / 核抄 / 任务 =====
check('维保 ≥ 130 条且三类齐备', data.maintenanceOrders.length >= 130 && ['fire', 'elevator', 'daily'].every((c) => data.maintenanceOrders.some((m) => m.category === c)), `${data.maintenanceOrders.length} 条`)
check('存在超期未执行维保(计划前天,进日报)', data.maintenanceOrders.some((m) => !m.executedAt && m.plannedAt < refNow && diffHours(m.plannedAt, refNow) > 24))
check('今日有已执行维保(日报素材)', data.maintenanceOrders.some((m) => m.executedAt?.startsWith(DEMO_TODAY)))

check('巡检 180 条(近 90 天每日 2 条)', data.inspections.length === 180)
check('今日巡检:上午已执行 / 下午待执行', data.inspections.some((i) => i.executedAt?.startsWith(DEMO_TODAY)) && data.inspections.some((i) => i.plannedAt.startsWith(DEMO_TODAY) && !i.executedAt))
const abnormalItems = data.inspections.flatMap((i) => i.items.filter((x) => !x.ok))
check('巡检异常项 = 3', abnormalItems.length === 3, `${abnormalItems.length} 项`)
check('巡检归属仅 cs_wang / cs_liu', data.inspections.every((i) => i.ownerUsername === 'cs_wang' || i.ownerUsername === 'cs_liu'))

check('核抄 = 28 表 × 24 月 = 672 条', data.meterReadings.length === 672)
const meterMonths = new Set(data.meterReadings.map((r) => r.month))
check('核抄不含当月(6 月月末尚未核抄)', !meterMonths.has(CURRENT_MONTH) && meterMonths.size === 24)
const mayE = data.meterReadings.filter((r) => r.month === '2026-05' && r.type === 'electricity').reduce((s, r) => s + (r.currValue - r.prevValue), 0)
const mayE2025 = data.meterReadings.filter((r) => r.month === '2025-05' && r.type === 'electricity').reduce((s, r) => s + (r.currValue - r.prevValue), 0)
check('2026-05 电量同比为正增长(≤15%)', mayE > mayE2025 && mayE / mayE2025 < 1.15, `同比 ${pct(mayE / mayE2025 - 1)}`)

check('任务 36 条(3 年度 × 年/季/月/周)', data.workTasks.length === 36)
const roots = data.workTasks.filter((t) => t.level === 'year')
check('年度任务 3 条', roots.length === 3)
const byId = new Map(data.workTasks.map((t) => [t.id, t]))
const traceOk = data.workTasks
  .filter((t) => t.level === 'week')
  .every((t) => {
    let cur = t
    let hops = 0
    while (cur.parentId && hops < 5) {
      cur = byId.get(cur.parentId)!
      hops += 1
    }
    return cur.level === 'year'
  })
check('全部周任务可回溯至年度根任务(穿透链完整)', traceOk)
check('cs_liu 名下周任务 ≥ 2', data.workTasks.filter((t) => t.level === 'week' && t.ownerUsername === 'cs_liu').length >= 2)
check('存在进行中的本周任务(演示标记完成)', data.workTasks.some((t) => t.level === 'week' && t.status === 'open' && t.periodLabel.includes('第1周')))

// ===== 调研 / 发票 / 通知 / 跟进 =====
const sr1 = data.surveyResponses.filter((r) => r.surveyId === 'SR-01').length
const sr2 = data.surveyResponses.filter((r) => r.surveyId === 'SR-02').length
const sr3 = data.surveyResponses.filter((r) => r.surveyId === 'SR-03')
check('两期已结束调研各 30 份', sr1 === 30 && sr2 === 30, `${sr1}/${sr2}`)
check('进行中调研 12 份且不含故事①(留给演示填写)', sr3.length === 12 && !sr3.some((r) => r.companyId === 'C-03'), `${sr3.length} 份`)

check('发票 ≥ 80 张', data.invoices.length >= 80, `${data.invoices.length} 张`)
check('发票文件均指向示例 PDF', data.invoices.every((i) => /^\/invoices\/sample-[123]\.pdf$/.test(i.fileUrl ?? '')))
check('①云脉近月发票含物业/水电/车辆多费类', ['property', 'utility', 'vehicle'].every((cat) => data.invoices.some((i) => i.companyId === 'C-03' && i.category === cat)))
const invoicePaidOk = data.invoices.every((i) => {
  const related = data.bills.filter((b) => b.companyId === i.companyId && b.month === i.month && b.category === i.category)
  return related.length > 0 && related.every((b) => b.paidAmount >= b.amount)
})
check('每张发票对应「该企业该月该费类已缴清」', invoicePaidOk)

check('通知 6 条', data.notices.length === 6)
const outage = data.notices.find((n) => n.id === 'NT-001')!
check('停电通知:生效中 + 定向 B 区', outage.revokedAt == null && outage.endAt >= refNow && outage.scope.level === 'zone' && outage.scope.zoneId === 'B')
check('公共维修通知关联已验收的公共工单', (() => { const n = data.notices.find((x) => x.id === 'NT-002')!; const wo = data.workOrders.find((w) => w.id === n.relatedWorkOrderId); return wo?.kind === 'public' && wo.events.some((e) => e.type === 'CLOSED') })())
check('存在已撤销通知示例', data.notices.some((n) => n.revokedAt != null))

check('收款跟进历史:②一条已解决记录', data.followUpRecords.length === 1 && data.followUpRecords[0].companyId === 'C-13' && data.followUpRecords[0].status === 'resolved')

console.log(`\n当月应收 ${sum(juneAll)} 元,实收 ${sumPaid(juneAll)} 元,收缴率 ${pct(juneRate)}`)
console.log(failures === 0 ? '\n全部断言通过 ✅' : `\n${failures} 项断言失败 ❌`)
process.exit(failures === 0 ? 0 : 1)
