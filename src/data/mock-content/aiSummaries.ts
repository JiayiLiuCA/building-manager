import { formatPercent } from '../../lib/format'
import { formatWan } from '../../lib/charts'
import type { DashboardAiSummary } from '../types'
import type { ArrearsOverview } from '../selectors/billingSelectors'
import type { DailyReportData } from '../selectors/dailyReportSelectors'
import type { DashboardKpis } from '../selectors/dashboardSelectors'
import type { FollowUpRow } from '../selectors/followUpSelectors'

// ============================================================
// AI 摘要文案层(函数模板):吃当前角色的派生数字实时生成,
// 主管与客服的摘要各自成立且与页面数字一致(禁止静态硬对齐数字)。
// ============================================================

const SUGGESTION_TEXT = { collect: '建议跟进', hold: '暂缓跟进', pending: '暂不跟进' } as const

export function buildDashboardAiSummary(input: {
  displayName: string
  scopeLabel: string
  kpis: DashboardKpis
  arrears: ArrearsOverview
  followUps: FollowUpRow[]
  overdueWoCount: number
}): DashboardAiSummary {
  const { displayName, scopeLabel, kpis, arrears, followUps, overdueWoCount } = input
  const topFollowUps = followUps.filter((r) => r.suggestion !== 'pending').slice(0, 2)
  const pendingCount = followUps.filter((r) => r.suggestion === 'pending').length

  const paragraphs = [
    `${scopeLabel}本月应收 ${formatWan(kpis.receivable)},实收 ${formatWan(kpis.received)},收缴率 ${formatPercent(kpis.collectionRate)};累计欠费 ${formatWan(arrears.totalAmount)}(涉及 ${arrears.companyCount} 家),整体保持「企业欠费少」的健康水位。本月费用减免 ${kpis.waiverMonth.toLocaleString()} 元,年度累计 ${kpis.waiverYear.toLocaleString()} 元(占应收 ${formatPercent(kpis.waiverRatio)})。`,
    `服务面:本月新增工单 ${kpis.woNew} 张,关单率 ${formatPercent(kpis.woCloseRate)};当前超时未完工 ${overdueWoCount} 张${
      overdueWoCount > 0 ? ',请优先督办' : ''
    }。整体满意度 ${kpis.satisfaction.toFixed(1)} 分。`,
    topFollowUps.length > 0
      ? `收款跟进:${topFollowUps
          .map((r) => `${r.company.name}(欠 ${r.arrears.amount.toLocaleString()} 元,${SUGGESTION_TEXT[r.suggestion]})`)
          .join(';')};另有 ${pendingCount} 家处于习惯付款日前的待缴状态,暂不打扰。`
      : '收款跟进:当前无需重点跟进的欠费企业,继续按缴费习惯观察待缴户即可。',
  ]

  return {
    headline: `${displayName},这是${scopeLabel}今天的经营摘要`,
    paragraphs,
    sections: [
      {
        label: '今天最该看',
        text:
          overdueWoCount > 0 || topFollowUps.length > 0
            ? [
                overdueWoCount > 0 ? `${overdueWoCount} 张超时工单的闭环进度` : '',
                topFollowUps.length > 0 ? `${topFollowUps[0].company.name}的收款跟进前置判断` : '',
              ]
                .filter(Boolean)
                .join(';')
            : '各项指标平稳,可查看经营管理四费类达成率',
      },
      {
        label: '谁负责',
        text: '超时工单由工程部王建军督办;收款跟进由属地客服按「缴费习惯 / 报修关单 / 投诉关单」三依据执行。',
      },
      {
        label: '下一步',
        text: '服务问题未闭环的企业先修服务再谈收款;待缴企业到习惯付款日自动出现在日报提醒中。',
      },
    ],
  }
}

export function buildDailyAiSummary(input: {
  displayName: string
  scopeLabel: string
  report: DailyReportData
}): DashboardAiSummary {
  const { displayName, scopeLabel, report } = input
  const payday = report.paydayHints
  return {
    headline: `${displayName},${scopeLabel}今日日报已生成`,
    paragraphs: [
      `收款:今日到账 ${report.payments.count} 笔合计 ${report.payments.amount.toLocaleString()} 元,本月收缴率 ${formatPercent(report.collection.rate)}。${
        payday.length > 0
          ? `今天是${payday.map((h) => h.company.name).join('、')}的习惯付款日${payday.every((h) => h.paid) ? ',款项已如约到账' : ',请留意到账情况'}。`
          : ''
      }`,
      `服务:今日新增工单 ${report.workOrders.created} 张、关闭 ${report.workOrders.closed} 张(在途 ${report.workOrders.open});维保执行 ${report.maintenance.executedToday} 项${
        report.maintenance.overdue > 0 ? `,超期未执行 ${report.maintenance.overdue} 项需督办` : ''
      };巡检完成 ${report.inspections.doneToday} 次${report.inspections.pendingToday > 0 ? `,待执行 ${report.inspections.pendingToday} 次` : ''}${
        report.inspections.abnormalItems > 0 ? `,发现异常 ${report.inspections.abnormalItems} 项` : ''
      }。`,
      `触达:今日发布通知 ${report.notices.publishedToday} 条(生效中 ${report.notices.active} 条);新增满意度评价 ${report.ratings.count} 条${
        report.ratings.avg != null ? `(均分 ${report.ratings.avg.toFixed(1)})` : ''
      };调研新增回复 ${report.surveysSubmittedToday} 份;收款跟进新增 ${report.followUps.createdToday} 起、解决 ${report.followUps.resolvedToday} 起。`,
    ],
    sections: [
      {
        label: '今日亮点',
        text:
          report.payments.count > 0
            ? `${report.payments.count} 笔账款如约到账,缴费习惯档案的「按习惯跟进」策略持续生效。`
            : '今日暂无到账,重点关注在途工单与跟进事项。',
      },
      {
        label: '风险提示',
        text:
          report.maintenance.overdue > 0 || report.workOrders.open > 0
            ? `${report.maintenance.overdue > 0 ? `维保超期 ${report.maintenance.overdue} 项;` : ''}在途工单 ${report.workOrders.open} 张,注意 48 小时时效。`
            : '暂无显性风险。',
      },
      {
        label: '明日安排',
        text: '跟进未闭环工单与投诉;按巡检计划执行明日两次例行巡检;关注习惯付款日临近的企业到账情况。',
      },
    ],
  }
}
