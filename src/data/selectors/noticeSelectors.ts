import { demoNow } from '../../lib/date'
import type { AppData, Company, Notice, NoticeStatus } from '../types'

// ============================================================
// 通知口径:状态派生(撤销 > 过期 > 生效中);
// relevance = 影响范围与企业的空间匹配(park / zone / building / company)。
// ============================================================

export function deriveNoticeStatus(notice: Notice, now = demoNow()): NoticeStatus {
  if (notice.revokedAt) return 'revoked'
  if (notice.endAt < now) return 'expired'
  return 'active'
}

export function isNoticeRelevantToCompany(notice: Notice, company: Company): boolean {
  switch (notice.scope.level) {
    case 'park':
      return true
    case 'zone':
      return notice.scope.zoneId === company.zoneId
    case 'building':
      return notice.scope.buildingId === company.buildingId
    case 'company':
      return notice.scope.companyIds.includes(company.id)
  }
}

type NoticeSlice = Pick<AppData, 'notices' | 'companies'>

/** 企业端首页:与本企业相关的生效中通知(按发布时间倒序) */
export function getActiveNoticesForCompany(data: NoticeSlice, companyId: string, now = demoNow()): Notice[] {
  const company = data.companies.find((c) => c.id === companyId)
  if (!company) return []
  return data.notices
    .filter((n) => deriveNoticeStatus(n, now) === 'active' && isNoticeRelevantToCompany(n, company))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** 企业端历史通知(全部相关,含过期/撤销) */
export function getNoticesForCompany(data: NoticeSlice, companyId: string): Notice[] {
  const company = data.companies.find((c) => c.id === companyId)
  if (!company) return []
  return data.notices
    .filter((n) => isNoticeRelevantToCompany(n, company))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** 物业端通知列表(按发布时间倒序) */
export function getAllNotices(data: Pick<AppData, 'notices'>): Notice[] {
  return [...data.notices].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/** 影响范围的展示文案 */
export function noticeScopeLabel(
  notice: Notice,
  data: Pick<AppData, 'zones' | 'buildings' | 'companies'>,
): string {
  const scope = notice.scope
  switch (scope.level) {
    case 'park':
      return '全园区'
    case 'zone':
      return data.zones.find((z) => z.id === scope.zoneId)?.name ?? scope.zoneId
    case 'building':
      return data.buildings.find((b) => b.id === scope.buildingId)?.no ?? scope.buildingId
    case 'company': {
      const names = scope.companyIds.map((id) => data.companies.find((c) => c.id === id)?.name ?? id)
      return names.length <= 2 ? names.join('、') : `${names.slice(0, 2).join('、')} 等 ${names.length} 家企业`
    }
  }
}
