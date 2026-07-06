import { CURRENT_MONTH, lastMonths } from '../../lib/date'
import type { AppData, SurveyResponse, WorkOrder } from '../types'
import { reportedAt } from './workOrderSelectors'

// ============================================================
// 客户满意度双来源:
// - 被动满意度:企业报事报修关单评价(RATED,1~5 星),按报修月归集
// - 满意度调研:制式问卷(题目均分),按发布月归集
// 月度整体分 = 双来源当月评分的加权平均(按样本数)。
// ============================================================

export function responseAvg(r: SurveyResponse): number {
  const values = Object.values(r.scores)
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length
}

type SatisfactionSlice = Pick<AppData, 'workOrders' | 'surveys' | 'surveyResponses'>

export interface MonthlySatisfactionPoint {
  month: string
  passiveAvg: number | null
  passiveCount: number
  surveyAvg: number | null
  surveyCount: number
  /** 双来源加权整体分 */
  overall: number | null
}

function ratedInMonth(wos: WorkOrder[], month: string): WorkOrder[] {
  return wos.filter((w) => w.satisfactionRating != null && reportedAt(w).startsWith(month))
}

export function getMonthlySatisfaction(data: SatisfactionSlice, n = 12): MonthlySatisfactionPoint[] {
  return lastMonths(n).map((month) => {
    const rated = ratedInMonth(data.workOrders, month)
    const passiveCount = rated.length
    const passiveAvg = passiveCount === 0 ? null : rated.reduce((s, w) => s + (w.satisfactionRating ?? 0), 0) / passiveCount

    const surveyIds = new Set(data.surveys.filter((s) => s.publishedAt.startsWith(month)).map((s) => s.id))
    const responses = data.surveyResponses.filter((r) => surveyIds.has(r.surveyId))
    const surveyCount = responses.length
    const surveyAvg = surveyCount === 0 ? null : responses.reduce((s, r) => s + responseAvg(r), 0) / surveyCount

    const totalCount = passiveCount + surveyCount
    const overall =
      totalCount === 0
        ? null
        : ((passiveAvg ?? 0) * passiveCount + (surveyAvg ?? 0) * surveyCount) / totalCount
    return { month, passiveAvg, passiveCount, surveyAvg, surveyCount, overall }
  })
}

/** 本月整体满意度(驾驶舱 KPI;当月无样本时回退到最近有样本的月份) */
export function getCurrentSatisfaction(data: SatisfactionSlice): { score: number; month: string } {
  const points = getMonthlySatisfaction(data, 12)
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].overall != null) return { score: points[i].overall!, month: points[i].month }
  }
  return { score: 0, month: CURRENT_MONTH }
}

/** 满意度星级分布(被动评价,近 12 月) */
export function getRatingDist(data: Pick<AppData, 'workOrders'>): { star: 1 | 2 | 3 | 4 | 5; count: number }[] {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const wo of data.workOrders) {
    if (wo.satisfactionRating != null) dist[wo.satisfactionRating] += 1
  }
  return ([1, 2, 3, 4, 5] as const).map((star) => ({ star, count: dist[star] }))
}

export interface SurveyStats {
  surveyId: string
  responseCount: number
  avg: number | null
  perQuestion: Record<string, number>
}

export function getSurveyStats(data: Pick<AppData, 'surveyResponses'>, surveyId: string): SurveyStats {
  const responses = data.surveyResponses.filter((r) => r.surveyId === surveyId)
  const perQuestion: Record<string, number> = {}
  if (responses.length > 0) {
    const keys = Object.keys(responses[0].scores)
    for (const key of keys) {
      perQuestion[key] = responses.reduce((s, r) => s + (r.scores[key] ?? 0), 0) / responses.length
    }
  }
  return {
    surveyId,
    responseCount: responses.length,
    avg: responses.length === 0 ? null : responses.reduce((s, r) => s + responseAvg(r), 0) / responses.length,
    perQuestion,
  }
}

export interface LowScoreItem {
  kind: 'rating' | 'survey'
  at: string
  companyId?: string
  score: number
  text: string
  refId: string
}

/** 低分明细(≤3 分的被动评价与调研回复) */
export function getLowScores(data: SatisfactionSlice): LowScoreItem[] {
  const ratings: LowScoreItem[] = data.workOrders
    .filter((w) => w.satisfactionRating != null && w.satisfactionRating <= 3)
    .map((w) => ({
      kind: 'rating',
      at: reportedAt(w),
      companyId: w.companyId,
      score: w.satisfactionRating!,
      text: w.ratingComment ?? w.description,
      refId: w.id,
    }))
  const surveys: LowScoreItem[] = data.surveyResponses
    .filter((r) => responseAvg(r) <= 3.4)
    .map((r) => ({
      kind: 'survey',
      at: r.submittedAt,
      companyId: r.companyId,
      score: Math.round(responseAvg(r) * 10) / 10,
      text: r.comment ?? '问卷综合评分偏低',
      refId: r.surveyId,
    }))
  return [...ratings, ...surveys].sort((a, b) => b.at.localeCompare(a.at))
}
