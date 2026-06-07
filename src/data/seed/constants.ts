import type { Account, Staff, WorkOrderCategory } from '../types'

// ===== 小区结构定义 =====
export interface CommunityDef {
  id: string
  name: string
  buildings: number
  unitsPerBuilding: number
  /** 每单元户数(偶数,两户/层) */
  householdsPerUnit: number
}

export const COMMUNITY_DEFS: CommunityDef[] = [
  { id: 'HY', name: '和园', buildings: 3, unitsPerBuilding: 2, householdsPerUnit: 10 },
  { id: 'YF', name: '悦府', buildings: 2, unitsPerBuilding: 2, householdsPerUnit: 8 },
  { id: 'CX', name: '云溪', buildings: 1, unitsPerBuilding: 2, householdsPerUnit: 10 },
]

// ===== 员工 =====
export const STAFF: Staff[] = [
  { id: 'S-01', name: '陈志远', dept: 'management', role: 'manager' },
  { id: 'S-02', name: '王建军', dept: 'engineering', role: 'supervisor' },
  { id: 'S-03', name: '刘国栋', dept: 'engineering', role: 'staff' },
  { id: 'S-04', name: '马卫东', dept: 'engineering', role: 'staff' },
  { id: 'S-05', name: '郭永强', dept: 'engineering', role: 'staff' },
  { id: 'S-06', name: '周晓燕', dept: 'customer_service', role: 'supervisor' },
  { id: 'S-07', name: '李婷', dept: 'customer_service', role: 'staff' },
  { id: 'S-08', name: '赵海峰', dept: 'security', role: 'supervisor' },
  { id: 'S-09', name: '孙桂芳', dept: 'cleaning', role: 'supervisor' },
]

// ===== 登录账号 =====
export const ACCOUNTS: Account[] = [
  { username: 'admin', password: '123456', role: 'property', displayName: '陈志远' },
  { username: 'zhangwei', password: '123456', role: 'resident', displayName: '张伟', residentId: 'R-01' },
  { username: 'liqiang', password: '123456', role: 'resident', displayName: '李强', residentId: 'R-02' },
]

// ===== 姓名生成池 =====
export const SURNAMES = '王李张刘陈杨赵黄周吴徐孙马朱胡郭何林罗高梁宋郑谢韩唐冯于董萧'.split('')
export const GIVEN_NAMES = [
  '伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
  '勇', '艳', '杰', '娟', '涛', '明', '超', '霞', '平', '刚',
  '建华', '桂英', '玉兰', '秀珍', '志强', '海燕', '雪梅', '建国', '丽娟', '晓东',
  '文静', '国华', '春梅', '建平', '永康', '雅琴', '俊杰', '心怡', '志明', '淑华',
]

// ===== 工单描述池(按类型)=====
export const WO_DESCRIPTIONS: Record<WorkOrderCategory, string[]> = {
  plumbing: [
    '卫生间水管接口渗水,地面有积水',
    '厨房下水道堵塞,排水缓慢有异味',
    '马桶水箱漏水不止,水费偏高',
    '阳台地漏返味严重,需要检查',
    '热水器进水阀滴水',
  ],
  electrical: [
    '客厅插座没电,疑似线路故障',
    '卧室顶灯闪烁,开关接触不良',
    '入户门铃失灵,按了没反应',
    '厨房插座面板发烫,担心安全隐患',
    '阳台照明灯不亮,已换灯泡仍无效',
  ],
  door_window: [
    '入户门锁芯卡顿,钥匙难以转动',
    '窗户密封条老化,漏风渗水',
    '阳台推拉门滑轨卡顿,推拉费力',
    '卧室窗户合页松动,关不严',
  ],
  public_area: [
    '楼道声控灯损坏,夜间出行不便',
    '电梯运行时有异响,请尽快检查',
    '单元门禁失灵,刷卡无反应',
    '地下车库照明昏暗,部分灯不亮',
    '楼道墙面渗水起皮,疑似管道问题',
  ],
  other: [
    '门口绿化带积水,蚊虫滋生',
    '楼下垃圾桶满溢,清运不及时',
    '小区健身器材松动,存在安全隐患',
  ],
}

// ===== 完工说明池 =====
export const COMPLETION_NOTES = [
  '已更换损坏部件,现场测试正常',
  '已疏通管道并做防漏处理,观察无渗漏',
  '已紧固松动部件并润滑,使用正常',
  '已更换新配件,功能恢复正常',
  '已检修线路并更换老化元件,通电正常',
]

// ===== 评价留言池 =====
export const RATING_COMMENTS = [
  '师傅很专业,处理及时,满意',
  '响应快,服务态度好',
  '问题解决了,等的时间稍久',
  '修好了,师傅还帮忙清理了现场',
  '总体可以,希望以后响应再快一点',
]

// ===== 投诉内容池 =====
export const COMPLAINT_CONTENTS = [
  '公共区域卫生差,垃圾清运不及时,多次反映无改善',
  '夜间装修施工噪音扰民,请物业加强管理',
  '小区门禁经常失灵,外来人员随意进出,存在安全隐患',
  '楼道杂物堆积,消防通道被占用,请尽快清理',
  '绿化带维护不到位,草坪枯黄无人修剪',
  '电梯故障频繁,维修后仍有问题,影响出行',
]

// ===== 投诉回复池 =====
export const COMPLAINT_REPLIES = [
  '已安排专人核查并现场处理,后续将加强日常巡查频次,感谢您的反馈',
  '相关问题已整改完成,并已纳入部门周检清单,请您监督',
  '已与责任班组沟通并落实整改措施,如仍有问题请随时反馈',
]
