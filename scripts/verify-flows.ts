// M12 双端联动自测:直接驱动真实 Zustand store 走完六条核心演示链路
// 运行:npx tsx scripts/verify-flows.ts
import { useAppStore } from '../src/data/store'
import { getArrears } from '../src/data/selectors/billingSelectors'
import { deriveComplaintStatus, isSupervisorInvolved } from '../src/data/selectors/complaintSelectors'
import { getDunningSuggestion } from '../src/data/selectors/dunningSelectors'
import { getDashboardKpis, getRiskList, getSatisfactionDist } from '../src/data/selectors/dashboardSelectors'
import { deriveWorkOrderStatus, isWorkOrderOverdue } from '../src/data/selectors/workOrderSelectors'
import { STORY_IDS } from '../src/data/seed/storyHouseholds'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failures++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
const s = () => useAppStore.getState()

// ===================== 链路 1:报修全闭环 =====================
console.log('\n[1] 业主报修 → 物业接单/派单/预约/完工 → 业主签字 → 评价')
const ratedBefore = getSatisfactionDist(s()).reduce((sum, d) => sum + d.count, 0)
s().loginAs('zhangwei')
const woId = s().createWorkOrder({ category: 'plumbing', description: '联动自测:阳台地漏返味' })!
check('业主提交报修生成工单', !!woId && !!s().workOrders.find((w) => w.id === woId))
s().loginAs('admin')
s().acceptWorkOrder(woId)
s().dispatchWorkOrder(woId, 'engineering', 'S-03')
s().setAppointment(woId, '2026-06-06T15:00:00')
s().submitCompletion(woId, '已疏通并加装防臭芯')
check('物业四步后状态=已完成待签字', deriveWorkOrderStatus(s().workOrders.find((w) => w.id === woId)!) === 'done_pending_sign')
s().loginAs('zhangwei')
s().signAndCloseWorkOrder(woId)
check('业主签字后状态=已关单(双端同一条记录)', deriveWorkOrderStatus(s().workOrders.find((w) => w.id === woId)!) === 'closed')
s().rateWorkOrder(woId, 5, '联动自测好评')
const ratedAfter = getSatisfactionDist(s()).reduce((sum, d) => sum + d.count, 0)
check('评价进入驾驶舱满意度分布(+1)', ratedAfter === ratedBefore + 1, `${ratedBefore} → ${ratedAfter}`)

// ===================== 链路 2:催缴 → 弹窗 → 缴费 → 收缴率联动 =====================
console.log('\n[2] 张伟催缴弹窗 → 缴清 → 记录 resolved → 收缴率上升')
const zhangweiActive = s().dunningRecords.find((r) => r.householdId === STORY_IDS.zhangwei && r.status === 'active')
check('张伟存在 active 催缴记录(登录即弹窗)', !!zhangweiActive)
const rateBefore = getDashboardKpis(s()).collectionRate
const owing = getArrears(s(), STORY_IDS.zhangwei)
check('张伟欠费 4 个月', owing.months === 4, `实际 ${owing.months}`)
s().payBills(owing.bills.map((b) => b.id))
check('缴清后欠费归零', getArrears(s(), STORY_IDS.zhangwei).amount === 0)
check(
  '催缴记录自动 resolved',
  s().dunningRecords.find((r) => r.id === zhangweiActive!.id)?.status === 'resolved',
)
const rateAfter = getDashboardKpis(s()).collectionRate
check('物业端收缴率实时上升', rateAfter > rateBefore, `${(rateBefore * 100).toFixed(1)}% → ${(rateAfter * 100).toFixed(1)}%`)

// ===================== 链路 3:投诉升级链 =====================
console.log('\n[3] 业主投诉(关联工单)→ 派部门 → 回复 → 主管介入 → 主管回复 → 关闭')
const cpId = s().createComplaint({ content: '联动自测:对维修流程不满意', workOrderId: woId })!
check('投诉创建并关联工单', s().complaints.find((c) => c.id === cpId)?.workOrderId === woId)
s().loginAs('admin')
s().dispatchComplaint(cpId, 'engineering')
s().replyComplaint(cpId, '已复核维修质量,加装配件')
check('部门回复后状态=已回复', deriveComplaintStatus(s().complaints.find((c) => c.id === cpId)!) === 'replied')
s().loginAs('zhangwei')
s().requestSupervisor(cpId, '回复不满意,要求主管介入')
check('申请后状态=主管介入中', deriveComplaintStatus(s().complaints.find((c) => c.id === cpId)!) === 'supervisor')
s().loginAs('admin')
s().supervisorReply(cpId, '主管复核,已彻底处理并回访')
s().loginAs('zhangwei')
s().closeComplaint(cpId)
const cp = s().complaints.find((c) => c.id === cpId)!
check('投诉关闭且记录主管介入', deriveComplaintStatus(cp) === 'closed' && isSupervisorInvolved(cp))

// ===================== 链路 4(核心卖点):李强 暂缓→建议 实时联动 =====================
console.log('\n[4] 李强:解决超时工单 + 关闭投诉 → 催缴建议 🟠暂缓 实时变 🟢建议')
check('初始建议=hold(暂缓催缴)', getDunningSuggestion(s(), STORY_IDS.liqiang) === 'hold')
const liqiangWo = s().workOrders.find((w) => w.householdId === STORY_IDS.liqiang && isWorkOrderOverdue(w))
check('李强存在超时工单', !!liqiangWo)
s().loginAs('admin')
s().setAppointment(liqiangWo!.id, '2026-06-06T14:00:00')
s().submitCompletion(liqiangWo!.id, '已修复楼上管道渗漏并做防水')
check('完工后不再计为超时', !isWorkOrderOverdue(s().workOrders.find((w) => w.id === liqiangWo!.id)!))
check('仅完工仍=hold(投诉未闭环)', getDunningSuggestion(s(), STORY_IDS.liqiang) === 'hold')
const liqiangCp = s().complaints.find((c) => c.householdId === STORY_IDS.liqiang)!
s().replyComplaint(liqiangCp.id, '漏水已修复,后续每周回访')
s().closeComplaint(liqiangCp.id)
check('投诉闭环后建议实时变 collect 🟢', getDunningSuggestion(s(), STORY_IDS.liqiang) === 'collect')

// ===================== 链路 5:王秀兰 待核实 → 登记空置 =====================
console.log('\n[5] 王秀兰:⚪️数据待核实 → 核实登记空置 → 账单校准 + 停水停电待办')
check('初始建议=verify(疑似空置)', getDunningSuggestion(s(), STORY_IDS.wangxiulan) === 'verify')
const wangArrearsBefore = getArrears(s(), STORY_IDS.wangxiulan).amount
const tasksBefore = s().serviceTasks.length
s().setVacancy(STORY_IDS.wangxiulan, true)
const wang = s().households.find((h) => h.id === STORY_IDS.wangxiulan)!
check('已登记空置且异常标记清除', wang.isVacant && wang.anomaly === null)
const wangArrearsAfter = getArrears(s(), STORY_IDS.wangxiulan).amount
check('未缴物业费按半价校准(欠费减半)', wangArrearsAfter === Math.round(wangArrearsBefore / 2), `${wangArrearsBefore} → ${wangArrearsAfter}`)
const newTask = s().serviceTasks[s().serviceTasks.length - 1]
check('生成「停水停电」待办', s().serviceTasks.length === tasksBefore + 1 && newTask.type === 'CUT_UTILITIES' && newTask.status === 'open')
s().completeServiceTask(newTask.id)
check('待办可标记完成', s().serviceTasks.find((t) => t.id === newTask.id)?.status === 'done')
check('核实后建议变 collect(按半价催缴)', getDunningSuggestion(s(), STORY_IDS.wangxiulan) === 'collect')

// ===================== 链路 6:发起催缴 → 标记上报 → 风险清单 =====================
console.log('\n[6] 周杰已上报 + 新户发起催缴/上报 → 驾驶舱风险清单')
check('周杰预置上报在风险清单中', getRiskList(s()).some((r) => r.text.includes('周杰')))
s().startDunning(STORY_IDS.wangxiulan)
const wangRecord = s().dunningRecords.find((r) => r.householdId === STORY_IDS.wangxiulan && r.status === 'active')
check('对王秀兰发起催缴生成 active 记录', !!wangRecord)
s().reportDunning(wangRecord!.id)
check('标记上报后进入风险清单', getRiskList(s()).some((r) => r.text.includes('王秀兰')))

// ===================== 附加:个人信息同步 + AI 客服 =====================
console.log('\n[附] 个人信息跨端同步 + AI 客服规则回复')
s().loginAs('liqiang')
s().updateResidentProfile({ phone: '19900001111' })
check(
  '改手机号同步到物业端户档案',
  s().households.find((h) => h.id === STORY_IDS.liqiang)?.ownerPhone === '19900001111',
)
const msgsBefore = s().chatMessages.length
s().sendChatMessage('物业费怎么收?')
await new Promise((r) => setTimeout(r, 800))
const lastMsg = s().chatMessages[s().chatMessages.length - 1]
check('AI 客服 600ms 后规则回复', s().chatMessages.length === msgsBefore + 2 && lastMsg.role === 'ai' && lastMsg.content.includes('2.5'))

console.log(failures === 0 ? '\n✅ 全部联动链路通过' : `\n❌ ${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
