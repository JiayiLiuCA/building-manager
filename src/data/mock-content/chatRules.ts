import { formatCurrency } from '../../lib/format'
import { PROPERTY_FEE_RATE, SERVICE_PHONE } from '../constants'
import type { ChatContext } from '../types'

// ============================================================
// AI 客服规则:keywords 命中(按顺序、首中即回)→ 生成回复。
// 函数型回复可读业主上下文(欠费、在途工单),体现「智能」感。
// 演示前可直接改文案,不影响逻辑。
// ============================================================

interface ChatRule {
  keywords: string[]
  reply: (ctx: ChatContext) => string
}

export const CHAT_GREETING =
  '您好,我是和美物业 AI 助手 🤖\n可以咨询:物业费标准、账单欠费、报修进度、缴费方式、停车、装修等问题。请问有什么可以帮您?'

const RULES: ChatRule[] = [
  {
    keywords: ['欠费', '账单', '应缴', '欠多少', '要交多少'],
    reply: (ctx) =>
      ctx.arrearsAmount > 0
        ? `经查询,您的房屋(${ctx.householdLabel})目前共有 ${ctx.arrearsMonths} 个月账单未结清,合计 ${formatCurrency(ctx.arrearsAmount)}。您可以在「我的缴费」页面查看明细并在线缴纳。`
        : `经查询,您的房屋(${ctx.householdLabel})当前无欠费,所有账单均已结清,感谢您的支持!`,
  },
  {
    keywords: ['报修进度', '维修进度', '修到哪', '工单状态', '进度'],
    reply: (ctx) =>
      ctx.openWorkOrders.length > 0
        ? `您当前有 ${ctx.openWorkOrders.length} 个在途工单:\n${ctx.openWorkOrders.map((w) => `· ${w.id}(${w.statusLabel})`).join('\n')}\n详情可在「报修 / 工单」页面查看完整时间线。`
        : '您当前没有在途工单。如需报修,请在「报修 / 工单」页面提交,我们将在 48 小时内完成维修。',
  },
  {
    keywords: ['物业费', '收费标准', '费率', '怎么收'],
    reply: (ctx) =>
      `本小区物业费按 ${PROPERTY_FEE_RATE} 元/㎡·月 计收。您的房屋面积 ${ctx.areaSqm}㎡,每月物业费约 ${formatCurrency(ctx.monthlyPropertyFee)}${ctx.monthlyPropertyFee && ctx.arrearsAmount === 0 ? ',目前已按时缴清' : ''}。空置房屋经物业核实登记后按半价计收。`,
  },
  {
    keywords: ['怎么缴', '缴费方式', '怎么交', '在哪交', '支付'],
    reply: () =>
      '您可以在本系统「我的缴费」页面在线缴纳(支持物业费、水费、电费等),也可前往物业服务中心刷卡或现金缴纳。线上缴费实时到账并自动开具电子收据。',
  },
  {
    keywords: ['报修', '维修', '坏了', '漏水', '没电'],
    reply: () =>
      '请在「报修 / 工单」页面提交报修(选择类型并描述问题),客服会尽快接单并派维修师傅与您预约上门时间。我们承诺 48 小时内完成维修,完成后请您电子签字确认。',
  },
  {
    keywords: ['停水', '停电', '没水'],
    reply: () =>
      '请先查看小区公告栏或业主群是否有计划性停水停电通知;如非计划性停供,可能是设施故障,请在「报修 / 工单」页面提交报修,我们会优先处理。',
  },
  {
    keywords: ['投诉'],
    reply: () =>
      '您可以在「投诉」页面提交投诉(可关联具体工单),物业将派单至责任部门限期处理并回复您;若对处理结果不满意,可申请主管介入。',
  },
  {
    keywords: ['装修'],
    reply: () =>
      '装修前请携带装修方案到物业服务中心办理开工备案,缴纳装修押金,并遵守作业时间(工作日 8:00-12:00、14:00-18:00),严禁破坏承重结构。',
  },
  {
    keywords: ['停车', '车位', '车库'],
    reply: () =>
      '地面访客车位按 5 元/小时计费;产权/租赁车位管理费为 150 元/月,可在「我的缴费」中一并缴纳。如需办理月租车位,请联系物业服务中心。',
  },
  {
    keywords: ['电话', '人工', '客服', '联系'],
    reply: () =>
      `客服热线:${SERVICE_PHONE}(服务时间 8:30-18:00)。紧急报修(水管爆裂、电梯困人等)24 小时受理。您也可以继续在这里向我提问。`,
  },
  {
    keywords: ['你好', '您好', '在吗', 'hi', '帮助'],
    reply: (ctx) => `${ctx.ownerName}您好!${CHAT_GREETING}`,
  },
]

const FALLBACK = (ctx: ChatContext) =>
  `抱歉,这个问题我暂时无法准确回答 😅\n您可以换个问法(如「物业费怎么收」「我的报修进度」),或拨打客服热线 ${SERVICE_PHONE} 转人工咨询。${ctx.arrearsAmount > 0 ? `\n\n小提示:您当前有 ${formatCurrency(ctx.arrearsAmount)} 账单未结清,可在「我的缴费」中处理。` : ''}`

export function matchChatReply(text: string, ctx: ChatContext): string {
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.toLowerCase().includes(k))) return rule.reply(ctx)
  }
  return FALLBACK(ctx)
}
