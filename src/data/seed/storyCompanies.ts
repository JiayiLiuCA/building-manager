import { addHours, daysAgo, monthDay } from '../../lib/date'
import type { Rng } from '../../lib/prng'
import type { Company, Complaint, FollowUpRecord, Notice, Waiver, WorkOrder } from '../types'
import { STORY_COMPANY_IDS } from './constants'
import { buildWo } from './generators'

// ============================================================
// 三家故事企业的剧情编排(§10 演示故事线):
// ① C-03 云脉智能科技:模范客户,习惯 5 日对公转账,6-05 已缴清,满意度高
// ② C-13 精工精密制造:历史减免 ×2 + 超时报修 + 关联投诉 → 🟠;闭环后实时 🟢
// ③ C-25 洄澜餐饮管理:月末支票习惯,欠 5、6 两月 → 🟢;零售服务合同客户
// ============================================================

export interface StoryWos {
  /** ②:超时未闭环的中央空调漏水单(报修 3 天前,处理中)—— 🟠 的工单依据 */
  jinggongOverdue: WorkOrder
  /** ①:本月已关 + 5 星好评 */
  yunmaiClosedJune: WorkOrder
  /** ①:上月已关 + 5 星好评 */
  yunmaiClosedMay: WorkOrder
  /** ③:4 月已关 + 4 星 */
  huilanClosedApril: WorkOrder
  /** 公共单:中央广场地砖维修(已验收关单,关联「维修施工公告」) */
  plazaRepair: WorkOrder
}

export function buildStoryWorkOrders(companies: Company[], rng: Rng): StoryWos {
  const byId = (id: string) => {
    const c = companies.find((x) => x.id === id)
    if (!c) throw new Error(`故事企业 ${id} 不存在`)
    return c
  }
  const jinggong = byId(STORY_COMPANY_IDS.two)
  const yunmai = byId(STORY_COMPANY_IDS.one)
  const huilan = byId(STORY_COMPANY_IDS.three)

  return {
    jinggongOverdue: buildWo(
      {
        company: jinggong,
        category: 'hvac',
        description: '车间中央空调冷凝水管漏水,滴落至精密加工区设备上方,已影响生产排期',
        reported: daysAgo(3, '09:20'),
        flow: 'in_progress',
      },
      rng,
    ),
    yunmaiClosedJune: buildWo(
      {
        company: yunmai,
        category: 'door_access',
        description: '研发区门禁读卡器间歇失灵,部分员工无法刷卡进入',
        reported: monthDay('2026-06', 2, '10:15'),
        flow: 'closed',
        rating: 5,
      },
      rng,
    ),
    yunmaiClosedMay: buildWo(
      {
        company: yunmai,
        category: 'hvac',
        description: '机房精密空调告警,请求例行检查与滤网更换',
        reported: monthDay('2026-05', 12, '09:40'),
        flow: 'closed',
        rating: 5,
      },
      rng,
    ),
    huilanClosedApril: buildWo(
      {
        company: huilan,
        category: 'plumbing',
        description: '后厨隔油池排水不畅,高峰期返味',
        reported: monthDay('2026-04', 15, '14:20'),
        flow: 'closed',
        rating: 4,
      },
      rng,
    ),
    plazaRepair: buildWo(
      {
        location: { label: '园区中央广场' },
        category: 'public_facility',
        description: '中央广场多处地砖松动翘起,存在绊倒风险,安排集中维修',
        reported: monthDay('2026-05', 18, '09:00'),
        flow: 'closed',
      },
      rng,
    ),
  }
}

/** ②的关联投诉:空调漏水未彻底解决 → 未闭环(🟠 的投诉依据);引用已编号的工单 id */
export function buildStoryComplaints(companies: Company[], wos: StoryWos): Complaint[] {
  const jinggong = companies.find((c) => c.id === STORY_COMPANY_IDS.two)!
  const createdAt = daysAgo(2, '14:10')
  return [
    {
      id: '',
      companyId: jinggong.id,
      workOrderId: wos.jinggongOverdue.id,
      content: '空调漏水报修三天仍未彻底解决,精密加工区被迫局部停线,要求限期处理并说明补偿方案',
      events: [
        { type: 'CREATED', at: createdAt, by: jinggong.contactName, content: '空调漏水报修三天仍未彻底解决,精密加工区被迫局部停线,要求限期处理并说明补偿方案' },
        { type: 'DISPATCHED', at: addHours(createdAt, 2), by: '周晓燕', dept: 'engineering', content: '已转工程部限期处理' },
      ],
      responsibleDept: 'engineering',
    },
  ]
}

// ===== 历史减免记录(驾驶舱减免 KPI 的数据源)=====

export const WAIVER_DEFS: Waiver[] = [
  { id: 'WV-001', companyId: 'C-13', month: '2025-11', category: 'property', amount: 3000, reason: '车间改造施工期间,协商减免部分物业服务费' },
  { id: 'WV-002', companyId: 'C-13', month: '2026-02', category: 'utility', amount: 2000, reason: '中央空调故障期间能耗费补偿减免' },
  { id: 'WV-003', companyId: 'C-18', month: '2026-06', category: 'property', amount: 1500, reason: '配合园区消防演练占用仓储通道,协商减免' },
]

// ===== 收款跟进历史(②在 3 月有一次已解决的跟进,作为档案履历)=====

export function buildStoryFollowUps(): FollowUpRecord[] {
  return [
    {
      id: 'FU-001',
      companyId: STORY_COMPANY_IDS.two,
      createdAt: '2026-03-10T10:00:00',
      byUsername: 'cs_wang',
      arrearsAmountSnapshot: 36420,
      arrearsMonthsSnapshot: 1,
      suggestionSnapshot: 'collect',
      status: 'resolved',
      resolvedAt: '2026-03-15T14:20:00',
    },
  ]
}

// ===== 通知(6 条;含一条生效中的停电通知定向 B 区 → 企业②首页可见)=====

export function buildStoryNotices(plazaRepairWoId: string): Notice[] {
  return [
    {
      id: 'NT-001',
      type: 'power_outage',
      title: '停电检修通知:B 区高压配电设备年度检修',
      content: '因 B 区高压配电设备年度预防性试验,定于 2026-06-07(周日)08:00-18:00 对 B 区各楼栋分时段停电检修,请各企业提前做好设备关停与数据备份。给您带来不便,敬请谅解。',
      scope: { level: 'zone', zoneId: 'B' },
      startAt: '2026-06-05T08:00:00',
      endAt: '2026-06-08T18:00:00',
      publishedBy: '陈志远',
      publishedByUsername: 'admin',
      publishedAt: '2026-06-04T10:00:00',
    },
    {
      id: 'NT-002',
      type: 'public_repair',
      title: '中央广场地砖维修施工公告',
      content: '园区中央广场多处地砖松动,定于 2026-05-19 至 2026-05-21 分区围挡维修,施工期间请绕行东侧步道。',
      scope: { level: 'park' },
      startAt: '2026-05-18T18:00:00',
      endAt: '2026-05-21T18:00:00',
      publishedBy: '王琳',
      publishedByUsername: 'cs_wang',
      publishedAt: '2026-05-18T17:30:00',
      relatedWorkOrderId: plazaRepairWoId,
    },
    {
      id: 'NT-003',
      type: 'general',
      title: '园区通勤班车时刻调整公告(已撤销)',
      content: '原定 6 月起调整早班车发车时间,现因线路重新规划暂缓执行,另行通知。',
      scope: { level: 'park' },
      startAt: '2026-05-28T08:00:00',
      endAt: '2026-06-30T18:00:00',
      publishedBy: '周晓燕',
      publishedByUsername: 'admin',
      publishedAt: '2026-05-27T16:00:00',
      revokedAt: '2026-05-30T09:30:00',
    },
    {
      id: 'NT-004',
      type: 'general',
      title: '2026 年园区年中消防演练安排',
      content: '定于 2026-06-12(周五)15:00 开展全园区消防疏散演练,请各企业组织员工参加,演练期间货梯暂停使用约 40 分钟。',
      scope: { level: 'park' },
      startAt: '2026-06-01T08:00:00',
      endAt: '2026-06-12T18:00:00',
      publishedBy: '陈志远',
      publishedByUsername: 'admin',
      publishedAt: '2026-06-01T09:30:00',
    },
    {
      id: 'NT-005',
      type: 'general',
      title: 'A 区访客动线与临时车位优化公告',
      content: '自 6 月起 A 区访客统一由 2 号门进出,临时车位调整至 A5 栋南侧,请提前告知来访客户。',
      scope: { level: 'zone', zoneId: 'A' },
      startAt: '2026-06-03T08:00:00',
      endAt: '2026-06-20T18:00:00',
      publishedBy: '王琳',
      publishedByUsername: 'cs_wang',
      publishedAt: '2026-06-03T08:30:00',
    },
    {
      id: 'NT-006',
      type: 'water_outage',
      title: 'C1 栋夜间停水通知:生活水箱清洗',
      content: 'C1 栋定于 2026-05-12 22:00 至次日 05:00 停水清洗生活水箱,请沿街商户提前储水。',
      scope: { level: 'building', buildingId: 'C1' },
      startAt: '2026-05-12T08:00:00',
      endAt: '2026-05-13T08:00:00',
      publishedBy: '刘洋',
      publishedByUsername: 'cs_liu',
      publishedAt: '2026-05-11T15:00:00',
    },
  ]
}
