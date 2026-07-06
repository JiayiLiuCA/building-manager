import { formatCurrency } from '../../lib/format'
import { PROPERTY_FEE_RATE, SERVICE_PHONE } from '../constants'
import type { ChatContext } from '../types'

// ============================================================
// AI 咨询规则引擎(园区语境):按顺序首个关键词命中即回复;
// 回复函数读 ChatContext(企业实时上下文)体现「智能」。
// 演示前可直接改文案,引擎不动。
// ============================================================

export const CHAT_GREETING =
  '您好,我是和美产业园 AI 服务助手。可以帮您查询账单与欠费、报修进度、园区通知、发票开具、缴费方式等,请问有什么可以帮您?'

interface ChatRule {
  keywords: string[]
  reply: (ctx: ChatContext) => string
}

const RULES: ChatRule[] = [
  {
    keywords: ['欠费', '账单', '应缴', '待缴'],
    reply: (ctx) =>
      ctx.arrearsAmount > 0
        ? `${ctx.companyName}当前累计待缴 ${formatCurrency(ctx.arrearsAmount)}(涉及 ${ctx.arrearsMonths} 个月)。您可以在「账单与缴费」页勾选账单在线缴纳;如金额有疑问,可提交投诉或联系客服专员核对。`
        : `${ctx.companyName}目前没有待缴账单,全部费用已结清。您可以在「账单与缴费」页查看近 12 个月账单明细。`,
  },
  {
    keywords: ['报修进度', '维修进度', '工单进度', '修得怎么样'],
    reply: (ctx) =>
      ctx.openWorkOrders.length > 0
        ? `贵司当前有 ${ctx.openWorkOrders.length} 张在途工单:${ctx.openWorkOrders
            .map((wo) => `${wo.id}(${wo.statusLabel})`)
            .join('、')}。点击「报事报修」可查看处理时间线,完工后需要贵司电子签字确认。`
        : '贵司当前没有在途工单。如有设施问题,可在「报事报修」页发起,物业承诺 4 小时内响应、48 小时内完成维修。',
  },
  {
    keywords: ['物业费', '费率', '怎么收', '收费标准'],
    reply: (ctx) =>
      `园区物业服务费按 ${PROPERTY_FEE_RATE} 元/㎡·月计收。贵司计费面积 ${ctx.areaSqm}㎡,月物业服务费约 ${formatCurrency(ctx.monthlyPropertyFee)}。水电按园区总表分摊核抄,车位与增值服务按合同约定。`,
  },
  {
    keywords: ['发票', '开票', '税票'],
    reply: () =>
      '每月账单缴清后,物业会在 3 个工作日内上传对应费类的电子发票。您可以在「发票查询」页按月份/费类筛选并下载 PDF;如需专票信息变更,请联系客服专员。',
  },
  {
    keywords: ['停电', '停水', '通知', '公告'],
    reply: (ctx) =>
      ctx.activeNoticeTitles.length > 0
        ? `当前与贵司相关的生效通知有 ${ctx.activeNoticeTitles.length} 条:${ctx.activeNoticeTitles.join('、')}。详情请查看企业端首页通知区。`
        : '当前没有与贵司相关的生效中通知。停水停电、公共维修等信息会第一时间发布在企业端首页。',
  },
  {
    keywords: ['缴费方式', '怎么缴', '付款', '对公', '转账'],
    reply: (ctx) =>
      `${ctx.habitText ? `贵司登记的缴费习惯:${ctx.habitText}。` : ''}园区支持对公转账、支票与线上支付三种方式;在「账单与缴费」页可直接勾选账单在线缴纳,到账后收据与发票自动关联。`,
  },
  {
    keywords: ['投诉', '不满意', '态度'],
    reply: () =>
      '您可以在「报事报修 → 投诉」提交投诉(可关联工单),物业将派至唯一责任部门限期处理;若对回复不满意,可申请主管介入,处理全程可追溯。',
  },
  {
    keywords: ['装修', '施工', '改造'],
    reply: () =>
      '企业装修/改造需提前 5 个工作日向物业报备:提交施工方案与时间计划,物业审核消防与动火作业后发放施工许可;作业时间为工作日 8:30-18:00,噪音作业请安排在午休外时段。',
  },
  {
    keywords: ['车位', '停车', '临停', '访客车'],
    reply: () =>
      '固定车位 300 元/个·月、租赁车位 500 元/个·月,可联系客服专员办理增减;访客车辆走临停通道按时计费,月度临停额度可在前台登记减免。',
  },
  {
    keywords: ['人工', '电话', '客服', '联系'],
    reply: () => `需要人工服务请拨打园区服务热线 ${SERVICE_PHONE}(工作日 8:30-18:00),或联系贵司的客服专员,我们会尽快跟进。`,
  },
  {
    keywords: ['你好', '在吗', '帮助', 'hi', 'hello'],
    reply: (ctx) => `您好,${ctx.companyName}!我可以帮您查账单、跟工单、看通知、查发票,直接输入问题即可。`,
  },
]

const FALLBACK = (ctx: ChatContext): string =>
  `这个问题我还在学习中,建议拨打服务热线 ${SERVICE_PHONE} 联系客服专员。${
    ctx.arrearsAmount > 0 ? `另外提醒:贵司有 ${formatCurrency(ctx.arrearsAmount)} 待缴账单,可在「账单与缴费」页处理。` : ''
  }`

export function matchChatReply(text: string, ctx: ChatContext): string {
  const lower = text.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.reply(ctx)
  }
  return FALLBACK(ctx)
}
