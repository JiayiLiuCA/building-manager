import type {
  Account,
  Building,
  FeeCategory,
  InspectionTemplateKey,
  Park,
  PaymentHabit,
  Staff,
  ValueAddedType,
  WorkOrderCategory,
  Zone,
} from '../types'

// ============================================================
// Seed 的「剧本层」:园区结构、30 家企业显式定义、账号员工、
// 制式表单配置(巡检 checklist / 调研问卷)与园区语境文案池。
// 制式表单模板后续由物业公司提供,此处字段结构做成易替换配置。
// ============================================================

// ===== 园区 / 区 / 楼栋 =====
export const PARK: Park = { id: 'HM', name: '和美产业园' }

export const ZONES: Zone[] = [
  { id: 'A', name: 'A 区' },
  { id: 'B', name: 'B 区' },
  { id: 'C', name: 'C 区' },
]

export const BUILDINGS: Building[] = [
  { id: 'A1', zoneId: 'A', no: 'A1 栋', floors: 6 },
  { id: 'A2', zoneId: 'A', no: 'A2 栋', floors: 5 },
  { id: 'A3', zoneId: 'A', no: 'A3 栋', floors: 6 },
  { id: 'A4', zoneId: 'A', no: 'A4 栋', floors: 7 },
  { id: 'A5', zoneId: 'A', no: 'A5 栋', floors: 8 },
  { id: 'B1', zoneId: 'B', no: 'B1 栋', floors: 6 },
  { id: 'B2', zoneId: 'B', no: 'B2 栋', floors: 6 },
  { id: 'B3', zoneId: 'B', no: 'B3 栋', floors: 5 },
  { id: 'B4', zoneId: 'B', no: 'B4 栋', floors: 5 },
  { id: 'B5', zoneId: 'B', no: 'B5 栋', floors: 7 },
  { id: 'C1', zoneId: 'C', no: 'C1 栋', floors: 3 },
  { id: 'C2', zoneId: 'C', no: 'C2 栋', floors: 5 },
  { id: 'C3', zoneId: 'C', no: 'C3 栋', floors: 6 },
  { id: 'C4', zoneId: 'C', no: 'C4 栋', floors: 4 },
]

// ===== 企业显式定义(30 家;占位/面积/习惯全部确定,长尾字段由 PRNG 派生)=====
/**
 * 欠费画像:
 * story2 = 当月物业费+电费未缴(故事②,其余当月账单已缴)
 * story3 = 5、6 两月全部未缴(故事③)
 * pastTwoMonths = 4、5 两月挂账未缴,当月已按习惯缴清(历史欠费户)
 * currentMonth = 仅当月全部未缴(未到习惯付款日 / 无习惯记录)
 */
export type ArrearsPattern = 'story2' | 'story3' | 'pastTwoMonths' | 'currentMonth'

export interface CompanyDef {
  id: string
  name: string
  industry: string
  buildingId: string
  /** 省略 = 整栋独占 */
  floors?: number[]
  unitLabel?: string
  areaSqm: number
  /** 省略 = 无缴费习惯记录(收款跟进「待沟通核实」素材) */
  habit?: PaymentHabit
  arrears?: ArrearsPattern
  /** 当月账单于「今天」(2026-06-06 上午)到账 —— 日报「今日收款」素材 */
  paysToday?: boolean
}

export const COMPANY_DEFS: CompanyDef[] = [
  // ---- A 区(9 家:A1/A2/A3/A5 整栋,A4 多户)----
  { id: 'C-01', name: '宏芯半导体', industry: '半导体研发', buildingId: 'A1', areaSqm: 4800, habit: { payDay: 2, method: 'transfer' } },
  { id: 'C-02', name: '迅动机器人', industry: '智能装备制造', buildingId: 'A2', areaSqm: 4200, habit: { payDay: 4, method: 'online' } },
  { id: 'C-03', name: '云脉智能科技', industry: '人工智能软件', buildingId: 'A3', areaSqm: 5000, habit: { payDay: 5, method: 'transfer', note: '每月 5 日对公转账,财务流程固定' } },
  { id: 'C-04', name: '蓝湾生物医药', industry: '生物医药', buildingId: 'A5', areaSqm: 5600, habit: { payDay: 3, method: 'transfer' } },
  { id: 'C-05', name: '晨科软件', industry: '软件开发', buildingId: 'A4', floors: [2, 3], unitLabel: '2-3 层', areaSqm: 1000, habit: { payDay: 25, method: 'transfer', note: '习惯每月 25 日对公转账' }, arrears: 'currentMonth' },
  { id: 'C-06', name: '星图设计', industry: '工业设计', buildingId: 'A4', floors: [4], unitLabel: '4 层', areaSqm: 600, habit: { payDay: 4, method: 'online' } },
  { id: 'C-07', name: '亿讯传媒', industry: '数字营销', buildingId: 'A4', floors: [5], unitLabel: '5 层', areaSqm: 800, habit: { payDay: 6, method: 'transfer', note: '每月 6 日对公转账' }, paysToday: true },
  { id: 'C-08', name: '木聿网络', industry: '互联网服务', buildingId: 'A4', floors: [6], unitLabel: '6 层', areaSqm: 500, habit: { payDay: 2, method: 'online' } },
  { id: 'C-09', name: '澜山咨询', industry: '管理咨询', buildingId: 'A4', floors: [7], unitLabel: '7 层', areaSqm: 400, habit: { payDay: 5, method: 'transfer' } },
  // ---- B 区(12 家:B1/B3/B5 整栋,B2/B4 多户)----
  { id: 'C-10', name: '驰远新能源', industry: '新能源技术', buildingId: 'B1', areaSqm: 5200, habit: { payDay: 3, method: 'transfer' } },
  { id: 'C-11', name: '恒晖光电', industry: '光电元件制造', buildingId: 'B3', areaSqm: 4600, habit: { payDay: 5, method: 'transfer' } },
  { id: 'C-12', name: '万川物流科技', industry: '智慧物流', buildingId: 'B5', areaSqm: 6000, habit: { payDay: 2, method: 'transfer' } },
  { id: 'C-13', name: '精工精密制造', industry: '精密制造', buildingId: 'B2', floors: [3, 4], unitLabel: '3-4 层', areaSqm: 1600, habit: { payDay: 3, method: 'transfer' }, arrears: 'story2' },
  { id: 'C-14', name: '联创电子', industry: '电子元器件', buildingId: 'B2', floors: [1], unitLabel: '1 层', areaSqm: 800, habit: { payDay: 4, method: 'online' } },
  { id: 'C-15', name: '卓立仪器', industry: '精密仪器', buildingId: 'B2', floors: [2], unitLabel: '2 层', areaSqm: 900, habit: { payDay: 5, method: 'transfer' } },
  { id: 'C-16', name: '天工模具', industry: '模具加工', buildingId: 'B2', floors: [5], unitLabel: '5 层', areaSqm: 700, habit: { payDay: 3, method: 'online' } },
  { id: 'C-17', name: '明诚检测', industry: '第三方检测', buildingId: 'B2', floors: [6], unitLabel: '6 层', areaSqm: 600, habit: { payDay: 2, method: 'transfer' } },
  { id: 'C-18', name: '泰达仓储', industry: '仓储服务', buildingId: 'B4', floors: [1, 2], unitLabel: '1-2 层', areaSqm: 1400, habit: { payDay: 4, method: 'transfer' }, arrears: 'pastTwoMonths' },
  { id: 'C-19', name: '汇金融资租赁', industry: '融资租赁', buildingId: 'B4', floors: [3], unitLabel: '3 层', areaSqm: 500, habit: { payDay: 4, method: 'transfer' } },
  { id: 'C-20', name: '蓝鲸软件', industry: '企业软件', buildingId: 'B4', floors: [4], unitLabel: '4 层', areaSqm: 700, habit: { payDay: 5, method: 'online' } },
  { id: 'C-21', name: '尚品包装', industry: '包装印刷', buildingId: 'B4', floors: [5], unitLabel: '5 层', areaSqm: 600, arrears: 'currentMonth' },
  // ---- C 区(9 家:C2/C3/C4 整栋,C1 多户)----
  { id: 'C-22', name: '合信律师事务所', industry: '法律服务', buildingId: 'C2', areaSqm: 5200, habit: { payDay: 3, method: 'transfer' } },
  { id: 'C-23', name: '橙叙文化传媒', industry: '文化传媒', buildingId: 'C3', areaSqm: 5400, habit: { payDay: 5, method: 'transfer' } },
  { id: 'C-24', name: '星野健身', industry: '体育健身', buildingId: 'C4', areaSqm: 4600, habit: { payDay: 4, method: 'online' } },
  { id: 'C-25', name: '洄澜餐饮管理', industry: '餐饮连锁', buildingId: 'C1', floors: [1], unitLabel: '1 层 101-104', areaSqm: 1200, habit: { payDay: 28, method: 'cheque', note: '习惯月末支票付款' }, arrears: 'story3' },
  { id: 'C-26', name: '优选生活超市', industry: '零售商超', buildingId: 'C1', floors: [2], unitLabel: '2 层', areaSqm: 800, habit: { payDay: 2, method: 'online' } },
  { id: 'C-27', name: '悦读书吧', industry: '文化零售', buildingId: 'C1', floors: [3], unitLabel: '3 层', areaSqm: 500, habit: { payDay: 5, method: 'transfer' } },
  { id: 'C-28', name: '鲜丰便利', industry: '便利零售', buildingId: 'C1', floors: [1], unitLabel: '1 层 105', areaSqm: 300, habit: { payDay: 4, method: 'online' } },
  { id: 'C-29', name: '拾光咖啡', industry: '餐饮咖啡', buildingId: 'C1', floors: [1], unitLabel: '1 层 106', areaSqm: 200, habit: { payDay: 20, method: 'online', note: '习惯每月 20 日线上支付' }, arrears: 'currentMonth' },
  { id: 'C-30', name: '康桥药房', industry: '医药零售', buildingId: 'C1', floors: [1], unitLabel: '1 层 107', areaSqm: 300, habit: { payDay: 3, method: 'transfer' } },
]

/** 三家故事企业固定 id(§10 演示编排) */
export const STORY_COMPANY_IDS = {
  one: 'C-03', // 云脉智能科技:模范客户
  two: 'C-13', // 精工精密制造:🟠→🟢 实时联动主角
  three: 'C-25', // 洄澜餐饮管理:🟢 建议跟进 + 零售服务合同客户
} as const

// ===== 员工 =====
export const STAFF: Staff[] = [
  { id: 'S-01', name: '陈志远', dept: 'management', role: 'manager' },
  { id: 'S-02', name: '王琳', dept: 'customer_service', role: 'staff' },
  { id: 'S-03', name: '刘洋', dept: 'customer_service', role: 'staff' },
  { id: 'S-04', name: '周晓燕', dept: 'customer_service', role: 'supervisor' },
  { id: 'S-05', name: '王建军', dept: 'engineering', role: 'supervisor' },
  { id: 'S-06', name: '刘国栋', dept: 'engineering', role: 'staff' },
  { id: 'S-07', name: '马卫东', dept: 'engineering', role: 'staff' },
  { id: 'S-08', name: '郭永强', dept: 'engineering', role: 'staff' },
  { id: 'S-09', name: '赵海峰', dept: 'security', role: 'supervisor' },
  { id: 'S-10', name: '孙桂芳', dept: 'cleaning', role: 'supervisor' },
]

// ===== 登录账号(密码均 123456,登录页一键填入)=====
export const ACCOUNTS: Account[] = [
  { username: 'admin', password: '123456', role: 'supervisor', displayName: '陈志远' },
  { username: 'cs_wang', password: '123456', role: 'cs', displayName: '王琳' },
  { username: 'cs_liu', password: '123456', role: 'cs', displayName: '刘洋' },
  { username: 'company1', password: '123456', role: 'company', displayName: '云脉智能科技', companyId: STORY_COMPANY_IDS.one },
  { username: 'company2', password: '123456', role: 'company', displayName: '精工精密制造', companyId: STORY_COMPANY_IDS.two },
  { username: 'company3', password: '123456', role: 'company', displayName: '洄澜餐饮管理', companyId: STORY_COMPANY_IDS.three },
]

/** 默认客服分配(按服务区域):王琳 → A、B 区;刘洋 → C 区(权限设置页可改) */
export const DEFAULT_CS_ZONES: Record<string, string[]> = {
  cs_wang: ['A', 'B'],
  cs_liu: ['C'],
}

// ===== 增值服务合同(9 份;账单按合同逐月生成)=====
export interface VaContractDef {
  id: string
  companyId: string
  type: ValueAddedType
  name: string
  monthlyAmount: number
  start: string
  end: string
}

export const VA_CONTRACT_DEFS: VaContractDef[] = [
  { id: 'VA-01', companyId: 'C-02', type: 'home_service', name: '办公区驻场保洁服务', monthlyAmount: 6800, start: '2025-01', end: '2026-12' },
  { id: 'VA-02', companyId: 'C-11', type: 'home_service', name: '厂区绿植租摆养护', monthlyAmount: 3600, start: '2025-04', end: '2027-03' },
  { id: 'VA-03', companyId: 'C-12', type: 'home_service', name: '员工餐厅保洁托管', monthlyAmount: 5200, start: '2025-07', end: '2026-12' },
  { id: 'VA-04', companyId: 'C-22', type: 'asset_ops', name: 'C2 栋闲置层代租运营', monthlyAmount: 32000, start: '2025-03', end: '2027-02' },
  { id: 'VA-05', companyId: 'C-04', type: 'asset_ops', name: '实验楼配套资产托管', monthlyAmount: 26000, start: '2025-06', end: '2027-05' },
  { id: 'VA-06', companyId: 'C-12', type: 'asset_ops', name: '园区仓储场地联合运营', monthlyAmount: 45000, start: '2024-11', end: '2026-10' },
  { id: 'VA-07', companyId: 'C-25', type: 'retail', name: '园区餐饮联营(洄澜档口)', monthlyAmount: 8000, start: '2025-05', end: '2026-12' },
  { id: 'VA-08', companyId: 'C-28', type: 'retail', name: '便利店联营分成', monthlyAmount: 6500, start: '2025-02', end: '2027-01' },
  { id: 'VA-09', companyId: 'C-29', type: 'retail', name: '咖啡外摆点位租赁', monthlyAmount: 3800, start: '2025-08', end: '2026-07' },
]

// ===== 制式表单配置(后续由物业公司提供模板,此处结构可整体替换)=====
export interface InspectionTemplateDef {
  label: string
  items: { key: string; label: string }[]
}

export const INSPECTION_TEMPLATES: Record<InspectionTemplateKey, InspectionTemplateDef> = {
  security: {
    label: '安防巡检',
    items: [
      { key: 'gate', label: '门岗值守与访客登记' },
      { key: 'cctv', label: '监控设备运行' },
      { key: 'perimeter', label: '园区周界巡查' },
      { key: 'parking_order', label: '车辆道闸与停放秩序' },
    ],
  },
  fire: {
    label: '消防巡检',
    items: [
      { key: 'passage', label: '消防通道畅通' },
      { key: 'extinguisher', label: '灭火器压力与在位' },
      { key: 'emergency_light', label: '应急照明与疏散指示' },
      { key: 'hydrant', label: '消火栓完好' },
      { key: 'control_room', label: '消控室值班记录' },
    ],
  },
  cleaning: {
    label: '保洁巡检',
    items: [
      { key: 'lobby', label: '公共大堂保洁' },
      { key: 'elevator_car', label: '电梯轿厢清洁' },
      { key: 'restroom', label: '卫生间保洁消杀' },
      { key: 'garbage', label: '垃圾清运及时' },
      { key: 'greenery', label: '外围绿化养护' },
    ],
  },
  equipment: {
    label: '设备巡检',
    items: [
      { key: 'power_room', label: '配电房运行参数' },
      { key: 'elevator_room', label: '电梯机房环境' },
      { key: 'pump_room', label: '给排水泵房' },
      { key: 'hvac_unit', label: '中央空调机组' },
      { key: 'lighting', label: '公共照明完好' },
    ],
  },
}

/** 巡检区域轮换表 */
export const INSPECTION_AREAS = [
  'A 区门岗及外围',
  'B 区门岗及外围',
  'C 区门岗及外围',
  '园区中央广场',
  '地下车库',
  '综合服务楼公区',
]

/** 满意度调研制式问卷(1~5 分) */
export const SURVEY_QUESTIONS: { key: string; label: string }[] = [
  { key: 'overall', label: '对园区物业服务的总体满意度' },
  { key: 'repair', label: '报事报修的响应速度与维修质量' },
  { key: 'environment', label: '园区环境与保洁绿化' },
  { key: 'security', label: '园区安全与车辆秩序管理' },
  { key: 'communication', label: '物业沟通与通知触达及时性' },
]

// ===== 园区语境文案池(工单 / 投诉 / 完工 / 评价)=====
export const WO_DESCRIPTIONS: Record<WorkOrderCategory, string[]> = {
  hvac: [
    '办公区中央空调制冷不足,下午室温偏高',
    '风机盘管漏水,吊顶有水渍',
    '新风系统噪音明显,影响会议室使用',
  ],
  plumbing: [
    '茶水间下水缓慢,疑似管道堵塞',
    '卫生间感应水龙头失灵,持续滴水',
    '顶层水压不足,用水高峰断流',
  ],
  electrical: [
    '工位区一路插座跳闸,恢复后仍不稳定',
    '走廊两处筒灯不亮,需更换灯具',
    '配电箱空开发热,请求检查',
  ],
  elevator: [
    '客梯运行时有异响,到层平层不准',
    '货梯门感应迟钝,夹到货物边缘',
  ],
  fire: [
    '楼层烟感误报,凌晨触发告警',
    '消火栓箱门变形无法完全闭合',
  ],
  door_access: [
    '门禁刷卡间歇失灵,员工进出受阻',
    '大堂玻璃门地弹簧损坏,关闭有异响',
  ],
  public_facility: [
    '园区路灯两盏不亮,夜间通行昏暗',
    '中央广场地砖松动翘起,存在绊倒风险',
    '停车场道闸抬杆缓慢,高峰期排队',
  ],
  other: ['会议室隔断轨道卡顿', '室外指示牌松动'],
}

/** 公共区域维修的位置池(zoneId 为空 = 全园区公共) */
export const PUBLIC_WO_LOCATIONS: { zoneId?: string; buildingId?: string; label: string }[] = [
  { label: '园区中央广场' },
  { label: '园区主入口道闸' },
  { zoneId: 'A', label: 'A 区地下车库' },
  { zoneId: 'B', label: 'B 区园区道路' },
  { zoneId: 'C', label: 'C 区外围绿化带' },
  { zoneId: 'A', buildingId: 'A4', label: 'A4 栋公共大堂' },
  { zoneId: 'B', buildingId: 'B2', label: 'B2 栋电梯厅' },
  { zoneId: 'C', buildingId: 'C1', label: 'C1 栋沿街雨棚' },
]

export const COMPLAINT_CONTENTS = [
  '货梯高峰期等待过久,影响物料转运效率,希望优化调度',
  '访客车辆登记流程繁琐,客户来访体验差',
  '楼层保洁频次不足,茶水间垃圾清运不及时',
  '园区外卖及快递车辆乱停,占用消防通道',
  '中央空调供冷时段与企业加班时间不匹配',
  '近期夜间施工噪音影响晚班员工休息',
]

export const COMPLAINT_REPLIES = [
  '已安排责任班组现场核实并落实整改,后续将加密巡查频次。',
  '已与相关方沟通调整作业时间,并增加现场引导人员。',
  '已制定整改方案:本周内完成设备调试与秩序整顿,请您监督。',
]

export const COMPLETION_NOTES = [
  '已更换损坏部件并测试运行正常,现场已清理。',
  '故障点已排除,连续观察 2 小时运行稳定。',
  '已完成检修并向企业对接人现场演示确认。',
]

export const RATING_COMMENTS_GOOD = [
  '响应很快,师傅专业,处理彻底。',
  '维修及时,没有影响正常办公。',
  '服务规范,完工后现场清理干净。',
]

export const RATING_COMMENTS_BAD = ['处理周期偏长,影响了正常经营,希望改进。']

/** 企业联系人姓名池(PRNG 取用) */
export const CONTACT_SURNAMES = '王李张刘陈杨赵黄周吴徐孙马朱胡郭何林罗高'.split('')
export const CONTACT_GIVEN_NAMES = [
  '伟', '敏', '静', '磊', '洋', '艳', '勇', '娟', '涛', '明',
  '超', '秀兰', '霞', '平', '刚', '桂英', '静怡', '志强', '海燕', '静文',
]

// ===== 年度任务树配置(年 → 季 → 月 → 周 由 generators 派生)=====
export interface YearTaskDef {
  title: string
  /** 季度拆解标题模板,{q} 替换为「一/二/三/四」 */
  quarterTitle: string
  /** 月度任务标题模板,{m} 替换为月份数字 */
  monthTitle: string
  /** 周任务标题模板,{w} 替换为周序号 */
  weekTitle: string
  ownerUsername: string
}

export const YEAR_TASK_DEFS: YearTaskDef[] = [
  {
    title: '2026 年园区物业费收缴率达成 96%',
    quarterTitle: '第{q}季度收缴率保持 95% 以上',
    monthTitle: '{m} 月账单核对与收款跟进全覆盖',
    weekTitle: '第{w}周:到期账单核对与习惯付款日跟进',
    ownerUsername: 'admin',
  },
  {
    title: '2026 年企业满意度提升至 4.6 分',
    quarterTitle: '第{q}季度满意度回访与低分整改',
    monthTitle: '{m} 月低分评价复盘与回访',
    weekTitle: '第{w}周:低分工单回访与整改确认',
    ownerUsername: 'cs_wang',
  },
  {
    title: '2026 年园区能耗核抄零差错',
    quarterTitle: '第{q}季度水电表计校验与核抄复核',
    monthTitle: '{m} 月全部表计核抄按期完成',
    weekTitle: '第{w}周:分区表计核抄与异常复核',
    ownerUsername: 'cs_liu',
  },
]

/** 费类月度目标系数区间:目标 = 该月该费类应收 × k(PRNG 在区间内取值) */
export const TARGET_K_RANGE: Record<FeeCategory, [number, number]> = {
  property: [0.98, 1.02],
  utility: [1.02, 1.06],
  vehicle: [1.05, 1.1],
  valueAdded: [0.9, 0.95],
}
