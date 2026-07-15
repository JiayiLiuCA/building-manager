import { Bot, ChevronDown, ChevronRight, ClipboardList, CreditCard, Megaphone, PenLine, ReceiptText, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getArrears, getCompanyMonthlyBills } from '@/data/selectors/billingSelectors'
import { getActiveFollowUpForCompany } from '@/data/selectors/followUpSelectors'
import { deriveNoticeStatus, getActiveNoticesForCompany, getNoticesForCompany } from '@/data/selectors/noticeSelectors'
import { deriveWorkOrderStatus, getCompanyWorkOrders } from '@/data/selectors/workOrderSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { CURRENT_MONTH } from '@/lib/date'
import { formatCurrency, formatDateTime, formatMonth } from '@/lib/format'
import { billStatusMap, noticeStatusMap, noticeTypeMap, paymentMethodMap } from '@/lib/statusMaps'
import { QuickUnlockCard } from './QuickUnlockCard'

const QUICK_LINKS = [
  { to: '/company/work-orders', label: '报事报修', icon: Wrench, desc: '4 小时响应承诺' },
  { to: '/company/bills', label: '账单缴费', icon: CreditCard, desc: '四费类在线缴纳' },
  { to: '/company/invoices', label: '发票查询', icon: ReceiptText, desc: '电子发票下载' },
  { to: '/company/chat', label: 'AI 咨询', icon: Bot, desc: '账单/报修/通知' },
]

export function CompanyHomePage() {
  const scoped = useScopedData()
  const companyId = scoped.currentUser?.companyId ?? ''
  const company = scoped.companies.find((c) => c.id === companyId)

  const activeNotices = useMemo(() => getActiveNoticesForCompany(scoped, companyId), [scoped, companyId])
  const allNotices = useMemo(() => getNoticesForCompany(scoped, companyId), [scoped, companyId])
  const monthBills = useMemo(() => getCompanyMonthlyBills(scoped, companyId, 1)[0], [scoped, companyId])
  const arrears = useMemo(() => getArrears(scoped, companyId), [scoped, companyId])
  const pendingSign = useMemo(
    () => getCompanyWorkOrders(scoped, companyId).filter((wo) => deriveWorkOrderStatus(wo) === 'done_pending_sign'),
    [scoped, companyId],
  )
  const activeSurveys = useMemo(
    () =>
      scoped.surveys.filter(
        (s) => s.status === 'active' && !scoped.surveyResponses.some((r) => r.surveyId === s.id && r.companyId === companyId),
      ),
    [scoped.surveys, scoped.surveyResponses, companyId],
  )
  const activeFollowUp = useMemo(() => getActiveFollowUpForCompany(scoped, companyId), [scoped, companyId])

  const todoCount = pendingSign.length + activeSurveys.length + (activeFollowUp ? 1 : 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title={`您好,${company?.contactName ?? ''}`}
        description={`${company?.name} · ${company?.zoneId} 区 ${company?.buildingId} 栋${
          company?.occupancy.type === 'whole' ? '(整栋)' : ` ${company?.occupancy.unitLabel ?? ''}`
        }`}
      />

      {/* ===== 生效中的园区通知(醒目置顶)===== */}
      {activeNotices.length > 0 && (
        <div className="space-y-2">
          {activeNotices.map((notice) => (
            <Card key={notice.id} className="border-amber-200/80 bg-amber-50/60 py-0">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Megaphone className="size-4 text-amber-600" />
                  <StatusBadge meta={noticeTypeMap[notice.type]} />
                  <span className="text-sm font-semibold">{notice.title}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{notice.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  生效时间 {formatDateTime(notice.startAt)} ~ {formatDateTime(notice.endAt)} · {notice.publishedBy} 发布
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== 快捷开门(高频动作置顶) ===== */}
      <QuickUnlockCard />

      {/* ===== 本月账单概览 ===== */}
      <Card className="py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b py-3!">
          <CardTitle className="text-sm font-medium">本月账单({formatMonth(CURRENT_MONTH)})</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
            <Link to="/company/bills">
              去缴费 <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">本月应缴</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(monthBills?.billed ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">已缴</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600 tabular-nums">{formatCurrency(monthBills?.paid ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">累计待缴</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${arrears.amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(arrears.amount)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {monthBills && monthBills.status !== 'none' && (
              <StatusBadge
                meta={
                  monthBills.outstanding === 0
                    ? { label: '本月已结清', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                    : billStatusMap[monthBills.status === 'paid' ? 'paid' : monthBills.status]
                }
              />
            )}
            {company?.paymentHabit && (
              <span>
                贵司缴费习惯:每月 {company.paymentHabit.payDay} 日{paymentMethodMap[company.paymentHabit.method]}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== 待办 ===== */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">待办事项{todoCount > 0 ? `(${todoCount})` : ''}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {todoCount === 0 && <EmptyState title="暂无待办" description="报修进度、调研与缴费提醒会出现在这里" />}
          {pendingSign.map((wo) => (
            <Link
              key={wo.id}
              to={`/company/work-orders/${wo.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <PenLine className="size-4 shrink-0 text-violet-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  工单 <span className="font-mono text-xs">{wo.id}</span> 已完工,待贵司电子签字关单
                </p>
                <p className="truncate text-xs text-muted-foreground">{wo.description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          {activeSurveys.map((s) => (
            <Link key={s.id} to="/company/survey" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
              <ClipboardList className="size-4 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">「{s.title}」进行中,邀请贵司填写</p>
                <p className="text-xs text-muted-foreground">制式问卷,约 1 分钟完成</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          {activeFollowUp && (
            <Link to="/company/bills?pay=1" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
              <CreditCard className="size-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">物业已登记收款跟进,待缴 {formatCurrency(arrears.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {company?.paymentHabit
                    ? `可按贵司习惯(每月 ${company.paymentHabit.payDay} 日)安排缴纳`
                    : '可联系客服专员核对账单后安排缴纳'}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          )}
        </CardContent>
      </Card>

      {/* ===== 快捷入口 ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="py-0 transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-1.5 p-4 text-center">
                <item.icon className="size-5 text-primary" />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ===== 历史通知 ===== */}
      <Collapsible>
        <Card className="py-0">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent/40">
            <Megaphone className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">历史通知</span>
            <Badge variant="outline" className="px-1.5 py-0 text-xs font-normal text-muted-foreground">
              {allNotices.length}
            </Badge>
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y border-t">
              {allNotices.map((notice) => (
                <div key={notice.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge meta={noticeTypeMap[notice.type]} />
                    <span className="text-sm font-medium">{notice.title}</span>
                    <StatusBadge meta={noticeStatusMap[deriveNoticeStatus(notice)]} />
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(notice.publishedAt)}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{notice.content}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
