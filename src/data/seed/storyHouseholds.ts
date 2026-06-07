import { daysAgo, lastMonths } from '../../lib/date'
import { getArrears } from '../selectors/billingSelectors'
import type { Bill, Complaint, DunningRecord, Household, Resident, WorkOrder } from '../types'

// ============================================================
// 手工编排的「故事户」—— 演示叙事主线:
//   张伟   🟢 建议催缴:服务到位仍欠费 4 个月,已被发起催缴(登录业主端弹窗)
//   李强   🟠 暂缓催缴:漏水工单超时 5 天 + 关联投诉未闭环 → 解决后实时变绿
//   王秀兰 ⚪️ 数据待核实:欠费 12 个月但长期无水电用量,疑似空置未登记
//   赵敏   空置户:物业费半价、水电停供、缴费正常
//   陈建国 投诉升级链:部门回复不满意 → 主管介入中
//   孙丽   反复投诉户(3 条投诉)
//   周杰   长期欠费 8 个月,催缴无果已标记上报 → 驾驶舱风险清单
//   吴静   当月物业费部分缴纳
// ============================================================

export const STORY_IDS = {
  zhangwei: 'HY-1-1-0101',
  liqiang: 'HY-2-1-0202',
  wangxiulan: 'YF-1-2-0401',
  zhaomin: 'HY-3-2-0501',
  chenjianguo: 'YF-2-1-0102',
  sunli: 'CX-1-1-0201',
  zhoujie: 'HY-1-2-0402',
  wujing: 'YF-1-1-0301',
} as const

export const STORY_ID_SET: Set<string> = new Set(Object.values(STORY_IDS))

/** 故事户业主姓名(filler 随机姓名生成时避开,防止重名混淆演示) */
export const STORY_OWNER_NAMES: Set<string> = new Set([
  '张伟', '李强', '王秀兰', '赵敏', '陈建国', '孙丽', '周杰', '吴静',
])

interface StoryIdentity {
  id: string
  ownerName: string
  ownerPhone: string
  areaSqm: number
  anomaly?: Household['anomaly']
  isVacant?: boolean
  vacantSince?: string
}

const IDENTITIES: StoryIdentity[] = [
  { id: STORY_IDS.zhangwei, ownerName: '张伟', ownerPhone: '13901234567', areaSqm: 98 },
  { id: STORY_IDS.liqiang, ownerName: '李强', ownerPhone: '13701112233', areaSqm: 106 },
  { id: STORY_IDS.wangxiulan, ownerName: '王秀兰', ownerPhone: '13633445566', areaSqm: 88, anomaly: 'suspected_vacant' },
  { id: STORY_IDS.zhaomin, ownerName: '赵敏', ownerPhone: '13855667788', areaSqm: 120, isVacant: true, vacantSince: '2025-12' },
  { id: STORY_IDS.chenjianguo, ownerName: '陈建国', ownerPhone: '13099887766', areaSqm: 110 },
  { id: STORY_IDS.sunli, ownerName: '孙丽', ownerPhone: '15866554433', areaSqm: 96 },
  { id: STORY_IDS.zhoujie, ownerName: '周杰', ownerPhone: '18677889900', areaSqm: 102 },
  { id: STORY_IDS.wujing, ownerName: '吴静', ownerPhone: '17744556677', areaSqm: 90 },
]

/** 把故事户的身份信息与状态写入生成的户列表(原地修改),并取消其车位费 */
export function applyStoryIdentities(households: Household[], parkingMap: Map<string, boolean>): void {
  for (const identity of IDENTITIES) {
    const h = households.find((x) => x.id === identity.id)
    if (!h) throw new Error(`故事户 ${identity.id} 不存在,请检查小区结构定义`)
    h.ownerName = identity.ownerName
    h.ownerPhone = identity.ownerPhone
    h.areaSqm = identity.areaSqm
    if (identity.anomaly) h.anomaly = identity.anomaly
    if (identity.isVacant) {
      h.isVacant = true
      h.vacantSince = identity.vacantSince
    }
    parkingMap.set(identity.id, false)
  }
}

export interface PayProfile {
  unpaidMonths: string[]
  partialMonths: string[]
}

/** 故事户的缴费画像 */
export function storyPayProfiles(): Map<string, PayProfile> {
  const months12 = lastMonths(12)
  const profiles = new Map<string, PayProfile>()
  profiles.set(STORY_IDS.zhangwei, { unpaidMonths: months12.slice(-4), partialMonths: [] }) // 2026-03 ~ 06
  profiles.set(STORY_IDS.liqiang, { unpaidMonths: months12.slice(-3), partialMonths: [] }) // 2026-04 ~ 06
  profiles.set(STORY_IDS.wangxiulan, { unpaidMonths: [...months12], partialMonths: [] }) // 全部 12 个月
  profiles.set(STORY_IDS.zhoujie, { unpaidMonths: months12.slice(-8), partialMonths: [] }) // 2025-11 ~ 2026-06
  profiles.set(STORY_IDS.wujing, { unpaidMonths: [], partialMonths: months12.slice(-1) }) // 当月部分缴纳
  return profiles
}

// ===== 故事工单(事件链手工编排,保证时间线精确可控)=====

export interface StoryWorkOrders {
  /** 张伟:已关单 + 5 星评价(展示完整闭环) */
  zhangweiClosed: WorkOrder
  /** 张伟:已完成待签字(业主端演示电子签字 → 评价) */
  zhangweiPendingSign: WorkOrder
  /** 张伟:今晨新报修,待接单(物业端演示 接单→派单→预约→完工) */
  zhangweiPending: WorkOrder
  /** 李强:漏水工单超时 5 天未完工(暂缓催缴的根源之一) */
  liqiangLeak: WorkOrder
  /** 孙丽:两单已关 */
  sunliWo1: WorkOrder
  sunliWo2: WorkOrder
}

export function buildStoryWorkOrders(): StoryWorkOrders {
  const zhangweiClosed: WorkOrder = {
    id: '',
    householdId: STORY_IDS.zhangwei,
    category: 'plumbing',
    description: '厨房水龙头滴水不止,关不紧',
    events: [
      { type: 'REPORTED', at: '2026-05-12T09:20:00', by: '张伟', note: '厨房水龙头滴水不止,关不紧' },
      { type: 'ACCEPTED', at: '2026-05-12T10:00:00', by: '李婷', note: '客服确认受理' },
      { type: 'DISPATCHED', at: '2026-05-12T11:30:00', by: '王建军', note: '派单至工程部 刘国栋' },
      { type: 'APPOINTMENT_SET', at: '2026-05-12T14:00:00', by: '刘国栋', note: '预约上门时间 2026-05-13 10:00' },
      { type: 'COMPLETED', at: '2026-05-13T11:30:00', by: '刘国栋', note: '已更换水龙头阀芯,测试无渗漏' },
      { type: 'SIGNED', at: '2026-05-13T14:00:00', by: '张伟', note: '业主签字确认' },
      { type: 'CLOSED', at: '2026-05-13T14:01:00', by: '系统', note: '签字完成,自动关单' },
      { type: 'RATED', at: '2026-05-13T14:05:00', by: '张伟', note: '师傅很专业,处理很快' },
    ],
    assignedDept: 'engineering',
    assignedStaffId: 'S-03',
    appointmentAt: '2026-05-13T10:00:00',
    completionNote: '已更换水龙头阀芯,测试无渗漏',
    satisfactionRating: 5,
    ratingComment: '师傅很专业,处理很快',
  }

  const zhangweiPendingSign: WorkOrder = {
    id: '',
    householdId: STORY_IDS.zhangwei,
    category: 'electrical',
    description: '客厅空开频繁跳闸,部分插座断电',
    events: [
      { type: 'REPORTED', at: '2026-06-04T10:15:00', by: '张伟', note: '客厅空开频繁跳闸,部分插座断电' },
      { type: 'ACCEPTED', at: '2026-06-04T11:00:00', by: '李婷', note: '客服确认受理' },
      { type: 'DISPATCHED', at: '2026-06-04T13:00:00', by: '王建军', note: '派单至工程部 马卫东' },
      { type: 'APPOINTMENT_SET', at: '2026-06-04T15:00:00', by: '马卫东', note: '预约上门时间 2026-06-05 09:00' },
      { type: 'COMPLETED', at: '2026-06-05T11:40:00', by: '马卫东', note: '更换损坏空开,全屋线路检测正常' },
    ],
    assignedDept: 'engineering',
    assignedStaffId: 'S-04',
    appointmentAt: '2026-06-05T09:00:00',
    completionNote: '更换损坏空开,全屋线路检测正常',
  }

  const zhangweiPending: WorkOrder = {
    id: '',
    householdId: STORY_IDS.zhangwei,
    category: 'door_window',
    description: '入户门锁芯卡顿,钥匙难以转动',
    events: [
      { type: 'REPORTED', at: daysAgo(0, '08:47'), by: '张伟', note: '入户门锁芯卡顿,钥匙难以转动' },
    ],
  }

  const liqiangLeak: WorkOrder = {
    id: '',
    householdId: STORY_IDS.liqiang,
    category: 'plumbing',
    description: '卫生间天花板渗水,疑似楼上管道漏水,已出现霉斑',
    events: [
      { type: 'REPORTED', at: '2026-06-01T09:12:00', by: '李强', note: '卫生间天花板渗水,疑似楼上管道漏水,已出现霉斑' },
      { type: 'ACCEPTED', at: '2026-06-01T09:40:00', by: '李婷', note: '客服确认受理' },
      { type: 'DISPATCHED', at: '2026-06-01T14:30:00', by: '王建军', note: '派单至工程部 刘国栋' },
    ],
    assignedDept: 'engineering',
    assignedStaffId: 'S-03',
  }

  const sunliWo1: WorkOrder = {
    id: '',
    householdId: STORY_IDS.sunli,
    category: 'public_area',
    description: '楼道声控灯损坏,夜间出行不便',
    events: [
      { type: 'REPORTED', at: '2026-04-18T19:30:00', by: '孙丽', note: '楼道声控灯损坏,夜间出行不便' },
      { type: 'ACCEPTED', at: '2026-04-19T09:00:00', by: '李婷', note: '客服确认受理' },
      { type: 'DISPATCHED', at: '2026-04-19T10:30:00', by: '王建军', note: '派单至工程部 郭永强' },
      { type: 'APPOINTMENT_SET', at: '2026-04-19T14:00:00', by: '郭永强', note: '预约上门时间 2026-04-20 10:00' },
      { type: 'COMPLETED', at: '2026-04-20T11:00:00', by: '郭永强', note: '已更换声控灯具,测试正常' },
      { type: 'SIGNED', at: '2026-04-20T18:30:00', by: '孙丽', note: '业主签字确认' },
      { type: 'CLOSED', at: '2026-04-20T18:31:00', by: '系统', note: '签字完成,自动关单' },
      { type: 'RATED', at: '2026-04-20T18:35:00', by: '孙丽', note: '修好了,但等了两天才来' },
    ],
    assignedDept: 'engineering',
    assignedStaffId: 'S-05',
    appointmentAt: '2026-04-20T10:00:00',
    completionNote: '已更换声控灯具,测试正常',
    satisfactionRating: 3,
    ratingComment: '修好了,但等了两天才来',
  }

  const sunliWo2: WorkOrder = {
    id: '',
    householdId: STORY_IDS.sunli,
    category: 'electrical',
    description: '入户门铃失灵,按了没反应',
    events: [
      { type: 'REPORTED', at: '2026-05-20T10:05:00', by: '孙丽', note: '入户门铃失灵,按了没反应' },
      { type: 'ACCEPTED', at: '2026-05-20T10:40:00', by: '李婷', note: '客服确认受理' },
      { type: 'DISPATCHED', at: '2026-05-20T13:20:00', by: '王建军', note: '派单至工程部 马卫东' },
      { type: 'APPOINTMENT_SET', at: '2026-05-20T15:00:00', by: '马卫东', note: '预约上门时间 2026-05-21 09:30' },
      { type: 'COMPLETED', at: '2026-05-21T10:40:00', by: '马卫东', note: '更换门铃电池并校准,恢复正常' },
      { type: 'SIGNED', at: '2026-05-21T19:00:00', by: '孙丽', note: '业主签字确认' },
      { type: 'CLOSED', at: '2026-05-21T19:01:00', by: '系统', note: '签字完成,自动关单' },
      { type: 'RATED', at: '2026-05-21T19:05:00', by: '孙丽', note: '响应还行' },
    ],
    assignedDept: 'engineering',
    assignedStaffId: 'S-04',
    appointmentAt: '2026-05-21T09:30:00',
    completionNote: '更换门铃电池并校准,恢复正常',
    satisfactionRating: 4,
    ratingComment: '响应还行',
  }

  return { zhangweiClosed, zhangweiPendingSign, zhangweiPending, liqiangLeak, sunliWo1, sunliWo2 }
}

// ===== 故事投诉 =====

export function buildStoryComplaints(wos: StoryWorkOrders): Complaint[] {
  const liqiangComplaint: Complaint = {
    id: '',
    householdId: STORY_IDS.liqiang,
    workOrderId: wos.liqiangLeak.id,
    content: '漏水报修 5 天无人上门维修,天花板霉斑持续扩大,强烈不满',
    events: [
      { type: 'CREATED', at: '2026-06-03T19:45:00', by: '李强', content: '漏水报修 5 天无人上门维修,天花板霉斑持续扩大,强烈不满' },
      { type: 'DISPATCHED', at: '2026-06-04T09:00:00', by: '周晓燕', dept: 'engineering', content: '已转工程部限期处理' },
    ],
    responsibleDept: 'engineering',
  }

  const chenComplaint: Complaint = {
    id: '',
    householdId: STORY_IDS.chenjianguo,
    content: '电梯上月维修后仍有明显异响,夜间尤其影响低层住户休息,要求彻底检修',
    events: [
      { type: 'CREATED', at: '2026-05-28T10:24:00', by: '陈建国', content: '电梯上月维修后仍有明显异响,夜间尤其影响低层住户休息,要求彻底检修' },
      { type: 'DISPATCHED', at: '2026-05-28T14:00:00', by: '周晓燕', dept: 'engineering', content: '已转工程部核查处理' },
      { type: 'REPLIED', at: '2026-05-30T11:20:00', by: '王建军', content: '已对电梯导轨润滑保养并加装减震垫,请观察几天' },
      { type: 'SUPERVISOR_REQUESTED', at: '2026-05-31T09:05:00', by: '陈建国', content: '处理后夜间噪音依旧,要求主管介入彻底解决' },
    ],
    responsibleDept: 'engineering',
  }

  const sunliComplaint1: Complaint = {
    id: '',
    householdId: STORY_IDS.sunli,
    content: '楼道保洁不及时,垃圾在楼层停留超过一天',
    events: [
      { type: 'CREATED', at: '2026-04-02T09:15:00', by: '孙丽', content: '楼道保洁不及时,垃圾在楼层停留超过一天' },
      { type: 'DISPATCHED', at: '2026-04-02T11:00:00', by: '周晓燕', dept: 'cleaning', content: '已转保洁部核查' },
      { type: 'REPLIED', at: '2026-04-03T10:30:00', by: '孙桂芳', content: '已调整该楼栋清运频次为每日两次,并加强检查' },
      { type: 'CLOSED', at: '2026-04-04T08:50:00', by: '孙丽', content: '业主确认解决,关闭投诉' },
    ],
    responsibleDept: 'cleaning',
  }

  const sunliComplaint2: Complaint = {
    id: '',
    householdId: STORY_IDS.sunli,
    workOrderId: wos.sunliWo1.id,
    content: '声控灯报修两天才修好,响应太慢',
    events: [
      { type: 'CREATED', at: '2026-04-21T09:40:00', by: '孙丽', content: '声控灯报修两天才修好,响应太慢' },
      { type: 'DISPATCHED', at: '2026-04-21T10:30:00', by: '周晓燕', dept: 'engineering', content: '已转工程部说明情况' },
      { type: 'REPLIED', at: '2026-04-22T09:20:00', by: '王建军', content: '近期维修任务集中导致排期延误,已增加公共区域报修优先级,向您致歉' },
      { type: 'CLOSED', at: '2026-04-23T08:30:00', by: '孙丽', content: '业主确认解决,关闭投诉' },
    ],
    responsibleDept: 'engineering',
  }

  const sunliComplaint3: Complaint = {
    id: '',
    householdId: STORY_IDS.sunli,
    content: '电动车占用消防通道充电,多次反映无改善',
    events: [
      { type: 'CREATED', at: '2026-06-02T15:30:00', by: '孙丽', content: '电动车占用消防通道充电,多次反映无改善' },
      { type: 'DISPATCHED', at: '2026-06-03T09:10:00', by: '周晓燕', dept: 'security', content: '已转秩序部整治' },
    ],
    responsibleDept: 'security',
  }

  return [liqiangComplaint, chenComplaint, sunliComplaint1, sunliComplaint2, sunliComplaint3]
}

// ===== 故事催缴记录(快照从已生成账单计算)=====

export function buildStoryDunningRecords(bills: Bill[]): DunningRecord[] {
  // 周杰:5 月 10 日发起催缴,当时欠费 7 个月(2025-11 ~ 2026-05);6 月 1 日催缴无果标记上报
  const zhoujieBills = bills.filter(
    (b) => b.householdId === STORY_IDS.zhoujie && b.paidAmount < b.amount && b.month <= '2026-05',
  )
  const zhoujieRecord: DunningRecord = {
    id: 'DN-001',
    householdId: STORY_IDS.zhoujie,
    createdAt: '2026-05-10T10:30:00',
    arrearsAmountSnapshot: zhoujieBills.reduce((s, b) => s + (b.amount - b.paidAmount), 0),
    arrearsMonthsSnapshot: new Set(zhoujieBills.map((b) => b.month)).size,
    suggestionSnapshot: 'collect',
    status: 'active',
    isReported: true,
    reportedAt: '2026-06-01T09:00:00',
  }

  // 张伟:6 月 5 日发起催缴(active 未上报)→ 业主端登录弹催缴弹窗
  const zhangweiArrears = getArrears({ bills }, STORY_IDS.zhangwei)
  const zhangweiRecord: DunningRecord = {
    id: 'DN-002',
    householdId: STORY_IDS.zhangwei,
    createdAt: '2026-06-05T16:20:00',
    arrearsAmountSnapshot: zhangweiArrears.amount,
    arrearsMonthsSnapshot: zhangweiArrears.months,
    suggestionSnapshot: 'collect',
    status: 'active',
    isReported: false,
  }

  return [zhoujieRecord, zhangweiRecord]
}

// ===== 业主登录账号对应的业主实体 =====

export function buildStoryResidents(): Resident[] {
  return [
    { id: 'R-01', name: '张伟', phone: '13901234567', householdId: STORY_IDS.zhangwei },
    { id: 'R-02', name: '李强', phone: '13701112233', householdId: STORY_IDS.liqiang },
  ]
}
