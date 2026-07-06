// 双端联动自测:直接驱动真实 Zustand store 走完核心演示链路(含权限隔离与新链路)
// 运行:npx tsx scripts/verify-flows.ts
import { useAppStore } from '../src/data/store'
import { getArrears } from '../src/data/selectors/billingSelectors'
import { deriveComplaintStatus } from '../src/data/selectors/complaintSelectors'
import { getDashboardKpis } from '../src/data/selectors/dashboardSelectors'
import { buildDailyReport } from '../src/data/selectors/dailyReportSelectors'
import { getActiveFollowUpForCompany, getFollowUpSuggestion } from '../src/data/selectors/followUpSelectors'
import { deriveNoticeStatus, getActiveNoticesForCompany } from '../src/data/selectors/noticeSelectors'
import { getRatingDist } from '../src/data/selectors/satisfactionSelectors'
import { getNoticeScopeOptions, getScopedData, getScopedInternal, visibleCompanyIds } from '../src/data/selectors/scope'
import { deriveWorkOrderStatus, isWorkOrderOverdue } from '../src/data/selectors/workOrderSelectors'
import { STORY_COMPANY_IDS } from '../src/data/seed/constants'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!cond) failures += 1
}
const s = () => useAppStore.getState()
const scoped = () => getScopedData(s())
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const C2 = STORY_COMPANY_IDS.two // 精工精密制造
const C3 = STORY_COMPANY_IDS.three // 洄澜餐饮管理

async function main() {
  // ===== 链路 1:报修全闭环 + 满意度联动(company1 → 物业 → 签字 → 评价)=====
  console.log('\n— 链路 1:报修闭环 + 满意度联动 —')
  s().loginAs('company1')
  const woId = s().createWorkOrder({ category: 'hvac', description: '演示:机房空调低压告警,请求检查' })!
  check('企业提交报修生成工单', !!woId && s().workOrders.some((w) => w.id === woId && w.kind === 'company'))
  s().loginAs('admin')
  s().acceptWorkOrder(woId)
  s().dispatchWorkOrder(woId, 'engineering', 'S-06')
  s().setAppointment(woId, '2026-06-06T15:00:00')
  s().submitCompletion(woId, '已更换传感器,试运行正常')
  check('物业四步后状态 = 待签字', deriveWorkOrderStatus(s().workOrders.find((w) => w.id === woId)!) === 'done_pending_sign')
  s().loginAs('company1')
  s().signAndCloseWorkOrder(woId)
  check('企业签字后状态 = 已关单(双端同一条记录)', deriveWorkOrderStatus(s().workOrders.find((w) => w.id === woId)!) === 'closed')
  const star5Before = getRatingDist(scoped()).find((d) => d.star === 5)!.count
  s().rateWorkOrder(woId, 5, '响应很快,处理专业')
  const star5After = getRatingDist(scoped()).find((d) => d.star === 5)!.count
  check('评价进入满意度分布(5 星 +1)', star5After === star5Before + 1)

  // ===== 链路 2:收款跟进三色实时联动(② hold → 闭环 → collect)=====
  console.log('\n— 链路 2:②精工 🟠→🟢 实时联动 —')
  s().loginAs('admin')
  check('②初始建议 = 暂缓(hold)', getFollowUpSuggestion(s(), C2) === 'hold')
  const overdueWo = s().workOrders.find((w) => w.companyId === C2 && isWorkOrderOverdue(w))!
  check('②存在超时未闭环工单', !!overdueWo)
  s().submitCompletion(overdueWo.id, '漏水点已封堵,冷凝管重新保温')
  check('完工后不再计超时', !isWorkOrderOverdue(s().workOrders.find((w) => w.id === overdueWo.id)!))
  check('仅完工仍 = hold(投诉未闭环)', getFollowUpSuggestion(s(), C2) === 'hold')
  const complaint = s().complaints.find((c) => c.companyId === C2 && deriveComplaintStatus(c) !== 'closed')!
  s().replyComplaint(complaint.id, '已彻底修复并制定补偿方案,向贵司致歉')
  s().closeComplaint(complaint.id)
  check('闭环投诉后建议实时变 collect(🟢)', getFollowUpSuggestion(s(), C2) === 'collect')

  // ===== 链路 3:发起跟进 → 企业提醒依据 → 缴费 → 自动解决 + 收缴率上升 =====
  console.log('\n— 链路 3:③发起跟进 → 缴费闭环 —')
  s().loginAs('cs_liu')
  const rateBefore = getDashboardKpis(scoped()).collectionRate
  s().startFollowUp(C3)
  const record = getActiveFollowUpForCompany(s(), C3)
  check('生成 active 跟进记录且快照 = collect', record?.status === 'active' && record.suggestionSnapshot === 'collect')
  s().loginAs('company3')
  check('企业端可见本司 active 跟进(提醒弹窗依据)', !!getActiveFollowUpForCompany(scoped(), C3))
  const owing = getArrears(s(), C3)
  check('③当前欠 2 个月', owing.months === 2, `${owing.amount} 元`)
  s().payBills(owing.bills.map((b) => b.id))
  check('缴清后欠费归零', getArrears(s(), C3).amount === 0)
  check('跟进记录自动 resolved', getActiveFollowUpForCompany(s(), C3) == null && s().followUpRecords.some((r) => r.companyId === C3 && r.status === 'resolved'))
  s().loginAs('cs_liu')
  const rateAfter = getDashboardKpis(scoped()).collectionRate
  check('刘洋收缴率实时上升', rateAfter > rateBefore, `${(rateBefore * 100).toFixed(1)}% → ${(rateAfter * 100).toFixed(1)}%`)

  // ===== 链路 4:通知发布 → 企业首页可见 → 撤销;客服发布范围受限 =====
  console.log('\n— 链路 4:停电通知定向与撤销 —')
  s().loginAs('admin')
  const ntId = s().publishNotice({
    type: 'power_outage',
    title: '演示:B4 栋临时停电检修',
    content: '今日 20:00-22:00 B4 栋配电检修,请提前保存数据。',
    scope: { level: 'building', buildingId: 'B4' },
    startAt: '2026-06-06T12:00:00',
    endAt: '2026-06-07T23:00:00',
  })!
  const inB4 = s().companies.find((c) => c.buildingId === 'B4')!.id
  check('B4 栋企业可见新通知', getActiveNoticesForCompany(s(), inB4).some((n) => n.id === ntId))
  check('B2 栋企业(②)不受此通知影响', !getActiveNoticesForCompany(s(), C2).some((n) => n.id === ntId))
  s().revokeNotice(ntId)
  check('撤销后通知不再生效', deriveNoticeStatus(s().notices.find((n) => n.id === ntId)!) === 'revoked' && !getActiveNoticesForCompany(s(), inB4).some((n) => n.id === ntId))
  s().loginAs('cs_liu')
  const opts = getNoticeScopeOptions(s())
  check('刘洋发通知范围仅 C 区(不可全园区)', !opts.canPark && opts.zoneIds.length === 1 && opts.zoneIds[0] === 'C' && opts.companyIds.every((id) => s().companies.find((c) => c.id === id)?.zoneId === 'C'))

  // ===== 链路 5:发票上传 → 企业端查询;权限隔离 =====
  console.log('\n— 链路 5:发票上传与隔离 —')
  s().loginAs('cs_wang')
  s().uploadInvoice({ companyId: C2, month: '2026-06', category: 'utility', amount: 5200, fileName: '发票-精工精密制造-2026-06-水电能耗费.pdf' })
  s().loginAs('company2')
  check('company2 可查到新发票', scoped().invoices.some((i) => i.companyId === C2 && i.month === '2026-06' && i.category === 'utility'))
  s().loginAs('company1')
  check('company1 不可见他司发票', scoped().invoices.every((i) => i.companyId === STORY_COMPANY_IDS.one))

  // ===== 链路 6:主管调整权限 → 两位客服可见范围与数字实时变化 =====
  console.log('\n— 链路 6:权限改配实时生效 —')
  s().loginAs('admin')
  const wangIdsBefore = s().csAssignments.find((a) => a.csUsername === 'cs_wang')!.companyIds
  const liuIdsBefore = s().csAssignments.find((a) => a.csUsername === 'cs_liu')!.companyIds
  s().loginAs('cs_wang')
  const wangRecvBefore = getDashboardKpis(scoped()).receivable
  s().loginAs('cs_liu')
  const liuRecvBefore = getDashboardKpis(scoped()).receivable
  s().loginAs('admin')
  s().setCsAssignment('cs_wang', [...wangIdsBefore, C3]) // 企业③改配给王琳
  s().loginAs('cs_wang')
  check('王琳可见企业数 21 → 22', visibleCompanyIds(s()).size === 22 && visibleCompanyIds(s()).has(C3))
  const wangRecvAfter = getDashboardKpis(scoped()).receivable
  s().loginAs('cs_liu')
  check('刘洋可见企业数 9 → 8', visibleCompanyIds(s()).size === 8 && !visibleCompanyIds(s()).has(C3))
  const liuRecvAfter = getDashboardKpis(scoped()).receivable
  check('两位客服应收随改配此消彼长', wangRecvAfter > wangRecvBefore && liuRecvAfter < liuRecvBefore, `王琳 +${wangRecvAfter - wangRecvBefore} / 刘洋 ${liuRecvAfter - liuRecvBefore}`)
  s().loginAs('admin')
  s().setCsAssignment('cs_liu', liuIdsBefore) // 恢复默认分配
  check('恢复分配后回到 21 / 9', s().csAssignments.find((a) => a.csUsername === 'cs_wang')!.companyIds.length === 21 && s().csAssignments.find((a) => a.csUsername === 'cs_liu')!.companyIds.length === 9)

  // ===== 链路 7:企业填写进行中调研 → 满意度聚合更新 =====
  console.log('\n— 链路 7:满意度调研填写 —')
  const sr3Before = s().surveyResponses.filter((r) => r.surveyId === 'SR-03').length
  s().loginAs('company1')
  s().submitSurveyResponse({ surveyId: 'SR-03', scores: { overall: 5, repair: 5, environment: 5, security: 4, communication: 5 }, comment: '服务到位,继续保持' })
  check('SR-03 回复数 +1 且含 company1', s().surveyResponses.filter((r) => r.surveyId === 'SR-03').length === sr3Before + 1 && s().surveyResponses.some((r) => r.surveyId === 'SR-03' && r.companyId === STORY_COMPANY_IDS.one))

  // ===== 链路 8:周任务标记完成 → 达成数变化 =====
  console.log('\n— 链路 8:任务穿透与达成 —')
  s().loginAs('cs_wang')
  const internal = getScopedInternal(s())
  const openWeek = internal.workTasks.find((t) => t.level === 'week' && t.status === 'open' && t.periodLabel.includes('第1周'))!
  check('王琳可见自己名下的进行中周任务', !!openWeek && openWeek.ownerUsername === 'cs_wang')
  const weekDoneBefore = s().workTasks.filter((t) => t.level === 'week' && t.status === 'done').length
  s().completeTask(openWeek.id)
  check('标记完成后周任务达成数 +1', s().workTasks.filter((t) => t.level === 'week' && t.status === 'done').length === weekDoneBefore + 1)

  // ===== 链路 9:AI 咨询规则命中 =====
  console.log('\n— 链路 9:AI 咨询 —')
  s().loginAs('company1')
  const msgBefore = s().chatMessages.length
  s().sendChatMessage('物业费怎么收?')
  await sleep(800)
  const msgs = s().chatMessages
  check('AI 咨询往返 +2 条且回复含费率 18', msgs.length === msgBefore + 2 && msgs[msgs.length - 1].role === 'ai' && msgs[msgs.length - 1].content.includes('18'), msgs[msgs.length - 1].content.slice(0, 40))

  // ===== 链路 10:日报实时性(今日动作进入日报动态)=====
  console.log('\n— 链路 10:日报实时联动 —')
  s().loginAs('admin')
  const dr = buildDailyReport(scoped(), getScopedInternal(s()))
  check('今日缴费(③)计入日报今日收款', dr.payments.bills.some((b) => b.companyId === C3))
  check('今日关闭工单 ≥ 1(链路 1 的签字关单)', dr.workOrders.closed >= 1)
  check('今日动态含链路产生的条目', dr.feed.some((f) => f.channel === 'payment') && dr.feed.some((f) => f.channel === 'workOrder'))

  console.log(failures === 0 ? '\n全部链路通过 ✅' : `\n${failures} 项断言失败 ❌`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
