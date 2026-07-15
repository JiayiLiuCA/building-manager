import { ChevronDown, CircleAlert, CircleCheck, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { DrillBreadcrumb } from '@/components/shared/DrillBreadcrumb'
import { EmptyState } from '@/components/shared/EmptyState'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getArrears,
  getBillStatus,
  getCompanyMonthlyBills,
  getCompanyWaivers,
} from '@/data/selectors/billingSelectors'
import { complaintCreatedAt, deriveComplaintStatus } from '@/data/selectors/complaintSelectors'
import { getActiveFollowUpForCompany, getFollowUpReasons, getFollowUpSuggestion } from '@/data/selectors/followUpSelectors'
import { getCompanyLocks } from '@/data/selectors/lockSelectors'
import { deriveWorkOrderStatus, getCompanyWorkOrders, reportedAt } from '@/data/selectors/workOrderSelectors'
import { getCompanyComplaints } from '@/data/selectors/complaintSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { PaymentMethod } from '@/data/types'
import { formatDateTime, formatMonth } from '@/lib/format'
import { CompanyLocksTab } from './CompanyLocksTab'
import {
  billStatusMap,
  billSubTypeMap,
  complaintStatusMap,
  deptMap,
  feeCategoryMap,
  followUpStatusMap,
  followUpSuggestionMap,
  getWoStatusMeta,
  paymentMethodMap,
  workOrderCategoryMap,
} from '@/lib/statusMaps'

export function CompanyDetailPage() {
  const { companyId } = useParams()
  const scoped = useScopedData()
  const company = scoped.companies.find((c) => c.id === companyId)
  if (!company) return <Navigate to="/property/companies" replace />
  return <DetailBody companyId={company.id} />
}

function DetailBody({ companyId }: { companyId: string }) {
  const scoped = useScopedData()
  const [searchParams, setSearchParams] = useSearchParams()
  const updatePaymentHabit = useAppStore((s) => s.updatePaymentHabit)
  const startFollowUp = useAppStore((s) => s.startFollowUp)

  const company = scoped.companies.find((c) => c.id === companyId)!
  const arrears = useMemo(() => getArrears(scoped, companyId), [scoped, companyId])
  const monthly = useMemo(() => getCompanyMonthlyBills(scoped, companyId, 12), [scoped, companyId])
  const waivers = useMemo(() => getCompanyWaivers(scoped, companyId), [scoped, companyId])
  const workOrders = useMemo(() => getCompanyWorkOrders(scoped, companyId), [scoped, companyId])
  const complaints = useMemo(() => getCompanyComplaints(scoped, companyId), [scoped, companyId])
  const invoices = useMemo(
    () => scoped.invoices.filter((i) => i.companyId === companyId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [scoped.invoices, companyId],
  )
  const followUps = useMemo(
    () => scoped.followUpRecords.filter((r) => r.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [scoped.followUpRecords, companyId],
  )
  const companyLocks = useMemo(() => getCompanyLocks(scoped, companyId), [scoped, companyId])
  const activeRecord = getActiveFollowUpForCompany(scoped, companyId)

  const tab = searchParams.get('tab') ?? 'bills'
  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    next.delete('detail')
    setSearchParams(next, { replace: true })
  }
  const openDetail = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', id)
    setSearchParams(next, { replace: true })
  }

  // ===== 缴费习惯编辑 =====
  const habit = company.paymentHabit
  const [habitOpen, setHabitOpen] = useState(false)
  const [payDay, setPayDay] = useState(() => String(habit?.payDay ?? 5))
  const [method, setMethod] = useState<PaymentMethod>(habit?.method ?? 'transfer')
  const [note, setNote] = useState(habit?.note ?? '')
  const payDayNum = Number(payDay)
  const habitValid = Number.isInteger(payDayNum) && payDayNum >= 1 && payDayNum <= 28

  const saveHabit = () => {
    updatePaymentHabit(companyId, { payDay: payDayNum, method, note: note.trim() || undefined })
    setHabitOpen(false)
    toast.success('缴费习惯已更新,收款跟进前置判断即时生效')
  }

  const locationLabel =
    company.occupancy.type === 'whole'
      ? `${company.zoneId} 区 ${company.buildingId} 栋(整栋独占)`
      : `${company.zoneId} 区 ${company.buildingId} 栋 ${company.occupancy.unitLabel}`

  return (
    <div className="space-y-4">
      <DrillBreadcrumb items={[{ label: '企业档案', to: '/property/companies' }, { label: company.name }]} />
      <PageHeader title={company.name} description={`${company.industry} · ${locationLabel}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 基本信息 */}
        <Card className="py-0 lg:col-span-2">
          <CardHeader className="border-b py-3!">
            <CardTitle className="text-sm font-medium">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-3">
            <InfoRow label="行业">{company.industry}</InfoRow>
            <InfoRow label="入驻位置">{locationLabel}</InfoRow>
            <InfoRow label="计费面积">{company.areaSqm.toLocaleString()}㎡</InfoRow>
            <InfoRow label="联系人">{company.contactName}</InfoRow>
            <InfoRow label="联系电话">{company.contactPhone}</InfoRow>
            <InfoRow label="合同期">
              {company.contractStart} ~ {company.contractEnd}
            </InfoRow>
          </CardContent>
        </Card>

        {/* 缴费习惯(重点) */}
        <Card className="py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b py-3!">
            <CardTitle className="text-sm font-medium">缴费习惯</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setHabitOpen(true)}>
              <Pencil className="size-3.5" /> 编辑
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-4 text-sm">
            {habit ? (
              <>
                <p>
                  每月 <span className="text-lg font-semibold tabular-nums">{habit.payDay}</span> 日 ·{' '}
                  {paymentMethodMap[habit.method]}
                </p>
                {habit.note && <p className="text-xs text-muted-foreground">{habit.note}</p>}
                <p className="text-xs text-muted-foreground">
                  用于收款跟进前置判断与日报「习惯付款日」提示;未到付款日的当月待缴不会被打扰。
                </p>
              </>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                未记录缴费习惯,建议与企业沟通后登记(收款跟进将显示「待沟通核实」)。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 收款跟进前置判断 */}
      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">收款跟进 · 前置判断</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {arrears.amount === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CircleCheck className="size-4" /> 当前无欠费,按缴费习惯正常缴清。
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge meta={followUpSuggestionMap[getFollowUpSuggestion(scoped, companyId)]} />
                {activeRecord && <StatusBadge meta={followUpStatusMap.active} />}
                <span className="text-sm font-medium tabular-nums text-red-600">
                  欠费 ¥{arrears.amount.toLocaleString()}({arrears.months} 个月)
                </span>
                {getFollowUpSuggestion(scoped, companyId) === 'collect' && !activeRecord && (
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      startFollowUp(companyId)
                      toast.success('已发起收款跟进,企业端登录将收到提醒')
                    }}
                  >
                    发起跟进
                  </Button>
                )}
              </div>
              <div className="grid gap-1.5 rounded-lg border bg-muted/30 p-3 md:grid-cols-3">
                {getFollowUpReasons(scoped, companyId).map((reason) => (
                  <div key={reason.key} className="flex items-start gap-1.5 text-xs">
                    {reason.hit ? (
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    ) : (
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    )}
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{reason.label}:</span>
                      {reason.text}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 档案 Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="bills">账单与减免</TabsTrigger>
          <TabsTrigger value="workOrders">工单 ({workOrders.length})</TabsTrigger>
          <TabsTrigger value="complaints">投诉 ({complaints.length})</TabsTrigger>
          <TabsTrigger value="invoices">发票 ({invoices.length})</TabsTrigger>
          <TabsTrigger value="locks">门锁 ({companyLocks.length})</TabsTrigger>
          <TabsTrigger value="followups">跟进记录 ({followUps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="locks">
          <CompanyLocksTab companyId={companyId} />
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <Card className="py-0">
            <CardHeader className="border-b py-3!">
              <CardTitle className="text-sm font-medium">近 12 个月账单(按月展开)</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {monthly.map((m) => (
                <Collapsible key={m.month}>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent/40">
                    <span className="w-20 text-left tabular-nums">{formatMonth(m.month)}</span>
                    {m.status === 'none' ? (
                      <span className="text-xs text-muted-foreground">无账单</span>
                    ) : (
                      <StatusBadge meta={billStatusMap[m.status]} />
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      应缴 <span className="font-medium text-foreground tabular-nums">¥{m.billed.toLocaleString()}</span>
                      {' · '}实缴 <span className="font-medium text-foreground tabular-nums">¥{m.paid.toLocaleString()}</span>
                      {m.outstanding > 0 && (
                        <>
                          {' · '}
                          <span className="font-medium text-red-600 tabular-nums">未缴 ¥{m.outstanding.toLocaleString()}</span>
                        </>
                      )}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1 border-t bg-muted/20 px-4 py-2">
                      {m.lines.map((bill) => (
                        <div key={bill.id} className="flex items-center gap-2 text-xs">
                          <span className="w-40">
                            {feeCategoryMap[bill.category].label}
                            {bill.subType && <span className="text-muted-foreground"> · {billSubTypeMap[bill.subType]}</span>}
                          </span>
                          <StatusBadge meta={billStatusMap[getBillStatus(bill)]} />
                          <span className="ml-auto tabular-nums">¥{bill.amount.toLocaleString()}</span>
                          <span className="w-32 text-right text-muted-foreground tabular-nums">
                            {bill.paidAt ? formatDateTime(bill.paidAt) : '未缴'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b py-3!">
              <CardTitle className="text-sm font-medium">历史减免记录</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {waivers.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="无减免记录" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">月份</TableHead>
                      <TableHead>费类</TableHead>
                      <TableHead className="text-right">减免金额</TableHead>
                      <TableHead>原因</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waivers.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="pl-4 tabular-nums">{formatMonth(w.month)}</TableCell>
                        <TableCell>
                          <StatusBadge meta={feeCategoryMap[w.category]} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">¥{w.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workOrders">
          <Card className="py-0">
            <CardContent className="p-0">
              {workOrders.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="暂无工单" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">工单号</TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead className="max-w-64">内容</TableHead>
                      <TableHead>报修时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>评价</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((wo) => (
                      <TableRow key={wo.id} className="cursor-pointer" onClick={() => openDetail(wo.id)}>
                        <TableCell className="pl-4 font-mono text-xs">{wo.id}</TableCell>
                        <TableCell>{workOrderCategoryMap[wo.category]}</TableCell>
                        <TableCell className="max-w-64">
                          <p className="truncate text-sm text-muted-foreground">{wo.description}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(reportedAt(wo))}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge meta={getWoStatusMeta(deriveWorkOrderStatus(wo), wo.kind)} />
                            <OverdueBadge workOrder={wo} />
                          </div>
                        </TableCell>
                        <TableCell>{wo.satisfactionRating ? <StarRating value={wo.satisfactionRating} /> : '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-primary">
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints">
          <Card className="py-0">
            <CardContent className="p-0">
              {complaints.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="暂无投诉" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">投诉号</TableHead>
                      <TableHead className="max-w-72">内容</TableHead>
                      <TableHead>关联工单</TableHead>
                      <TableHead>提交时间</TableHead>
                      <TableHead>责任部门</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c.id)}>
                        <TableCell className="pl-4 font-mono text-xs">{c.id}</TableCell>
                        <TableCell className="max-w-72">
                          <p className="truncate text-sm text-muted-foreground">{c.content}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.workOrderId ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {formatDateTime(complaintCreatedAt(c))}
                        </TableCell>
                        <TableCell>{c.responsibleDept ? deptMap[c.responsibleDept] : '待派单'}</TableCell>
                        <TableCell>
                          <StatusBadge meta={complaintStatusMap[deriveComplaintStatus(c)]} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-primary">
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="py-0">
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="暂无发票" description="在「企业档案 → 发票管理」上传后即时出现在这里" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">月份</TableHead>
                      <TableHead>费类</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead className="max-w-56">文件名</TableHead>
                      <TableHead>上传人 / 时间</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="pl-4 tabular-nums">{formatMonth(inv.month)}</TableCell>
                        <TableCell>
                          <StatusBadge meta={feeCategoryMap[inv.category]} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">¥{inv.amount.toLocaleString()}</TableCell>
                        <TableCell className="max-w-56">
                          <p className="truncate text-xs text-muted-foreground">{inv.fileName}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.uploadedBy} · {formatDateTime(inv.uploadedAt)}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm" className="text-primary">
                            <a href={inv.fileUrl ?? '/invoices/sample-1.pdf'} download target="_blank" rel="noreferrer">
                              下载
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups">
          <Card className="py-0">
            <CardContent className="p-0">
              {followUps.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="暂无跟进记录" description="在收款跟进列表对该企业「发起跟进」后出现" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">跟进单号</TableHead>
                      <TableHead>发起时间</TableHead>
                      <TableHead>发起人</TableHead>
                      <TableHead className="text-right">欠费快照</TableHead>
                      <TableHead>建议快照</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>解决时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followUps.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-4 font-mono text-xs">{r.id}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(r.createdAt)}</TableCell>
                        <TableCell className="text-sm">
                          {scoped.accounts.find((a) => a.username === r.byUsername)?.displayName ?? r.byUsername}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ¥{r.arrearsAmountSnapshot.toLocaleString()}({r.arrearsMonthsSnapshot} 个月)
                        </TableCell>
                        <TableCell>
                          <StatusBadge meta={followUpSuggestionMap[r.suggestionSnapshot]} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge meta={followUpStatusMap[r.status]} />
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {r.resolvedAt ? formatDateTime(r.resolvedAt) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑缴费习惯 */}
      <Dialog open={habitOpen} onOpenChange={setHabitOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑缴费习惯</DialogTitle>
            <DialogDescription>登记企业的付款节奏,收款跟进将按习惯给出「暂不跟进 / 建议跟进」判断。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">每月付款日(1-28)</Label>
                <Input type="number" min={1} max={28} value={payDay} onChange={(e) => setPayDay(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">付款方式</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(paymentMethodMap) as PaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {paymentMethodMap[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">备注(选填)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如:财务每月 25 日统一对公付款" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHabitOpen(false)}>
              取消
            </Button>
            <Button disabled={!habitValid} onClick={saveHabit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5">{children}</p>
    </div>
  )
}
