import { CircleAlert, CircleCheck, Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { getMonthCollection } from '@/data/selectors/billingSelectors'
import { getFollowUpRows } from '@/data/selectors/followUpSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { Company, FeeCategory, FollowUpSuggestion } from '@/data/types'
import type { ScopedState } from '@/data/selectors/scope'
import { CURRENT_MONTH, lastMonths } from '@/lib/date'
import { formatDateTime, formatMonth } from '@/lib/format'
import {
  feeCategoryMap,
  followUpStatusMap,
  followUpSuggestionMap,
  paymentMethodMap,
} from '@/lib/statusMaps'

export function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'followup' ? 'followup' : tabParam === 'invoices' ? 'invoices' : 'list'

  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    next.delete('detail')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="企业档案"
        description="企业列表 / 收款跟进 / 发票管理 · 全部数据按当前账号可见范围过滤"
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">企业列表 ({scoped.companies.length})</TabsTrigger>
          <TabsTrigger value="followup">收款跟进</TabsTrigger>
          <TabsTrigger value="invoices">发票管理 ({scoped.invoices.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <CompanyListTab scoped={scoped} />
        </TabsContent>
        <TabsContent value="followup">
          <FollowUpTab scoped={scoped} />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab scoped={scoped} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===== Tab 1:企业列表 =====

function CompanyListTab({ scoped }: { scoped: ScopedState }) {
  const navigate = useNavigate()
  const [zone, setZone] = useState('all')
  const [building, setBuilding] = useState('all')
  const [q, setQ] = useState('')

  const buildings = zone === 'all' ? scoped.buildings : scoped.buildings.filter((b) => b.zoneId === zone)

  const rows = useMemo(() => {
    const kw = q.trim()
    return scoped.companies.filter((c) => {
      if (zone !== 'all' && c.zoneId !== zone) return false
      if (building !== 'all' && c.buildingId !== building) return false
      if (kw && !(c.name.includes(kw) || c.industry.includes(kw) || c.contactName.includes(kw))) return false
      return true
    })
  }, [scoped.companies, zone, building, q])

  const monthStatus = (company: Company) => {
    const coll = getMonthCollection(scoped, CURRENT_MONTH, { companyId: company.id })
    if (coll.receivable === 0) return <span className="text-xs text-muted-foreground">—</span>
    if (coll.received >= coll.receivable) {
      return <StatusBadge meta={{ label: '本月已缴清', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }} />
    }
    return (
      <StatusBadge
        meta={{
          label: `待缴 ¥${(coll.receivable - coll.received).toLocaleString()}`,
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        }}
      />
    )
  }

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索企业 / 行业 / 联系人" className="h-8 w-60 pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select
            value={zone}
            onValueChange={(v) => {
              setZone(v)
              setBuilding('all')
            }}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部区域</SelectItem>
              {scoped.zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部楼栋</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="没有符合条件的企业" description="试试调整筛选条件" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">企业</TableHead>
                <TableHead>入驻位置</TableHead>
                <TableHead className="text-right">面积</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>合同期</TableHead>
                <TableHead>缴费习惯</TableHead>
                <TableHead>当月状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/property/companies/${c.id}`)}>
                  <TableCell className="pl-4">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.industry}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.zoneId} 区 {c.buildingId} 栋
                    {c.occupancy.type === 'whole' ? (
                      <Badge variant="outline" className="ml-1.5 text-[10px] text-muted-foreground">
                        整栋独占
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground"> {c.occupancy.unitLabel}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.areaSqm.toLocaleString()}㎡</TableCell>
                  <TableCell className="text-sm">
                    {c.contactName}
                    <span className="block text-xs text-muted-foreground">{c.contactPhone}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {c.contractStart} ~ {c.contractEnd}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.paymentHabit ? (
                      `每月 ${c.paymentHabit.payDay} 日 · ${paymentMethodMap[c.paymentHabit.method]}`
                    ) : (
                      <span className="text-amber-600">未记录</span>
                    )}
                  </TableCell>
                  <TableCell>{monthStatus(c)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ===== Tab 2:收款跟进(完整列表)=====

const SUGGESTION_KEYS: FollowUpSuggestion[] = ['collect', 'hold', 'pending']
const SUGGESTION_DOT: Record<FollowUpSuggestion, string> = {
  collect: 'bg-emerald-500',
  hold: 'bg-amber-500',
  pending: 'bg-zinc-400',
}

function FollowUpTab({ scoped }: { scoped: ScopedState }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const startFollowUp = useAppStore((s) => s.startFollowUp)
  const filter = searchParams.get('filter') as FollowUpSuggestion | null

  const rows = useMemo(() => getFollowUpRows(scoped), [scoped])
  const counts = useMemo(() => {
    const map: Record<FollowUpSuggestion, number> = { collect: 0, hold: 0, pending: 0 }
    rows.forEach((r) => (map[r.suggestion] += 1))
    return map
  }, [rows])
  const list = filter ? rows.filter((r) => r.suggestion === filter) : rows

  const toggleFilter = (s: FollowUpSuggestion) => {
    const next = new URLSearchParams(searchParams)
    if (filter === s) next.delete('filter')
    else next.set('filter', s)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {SUGGESTION_KEYS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleFilter(s)}
            className={`flex items-center gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/40 ${
              filter === s ? 'border-primary ring-2 ring-primary/15' : ''
            }`}
          >
            <span className={`size-2.5 rounded-full ${SUGGESTION_DOT[s]}`} />
            <span className="text-sm">{followUpSuggestionMap[s].label}</span>
            <span className="ml-auto text-lg font-semibold tabular-nums">{counts[s]}</span>
          </button>
        ))}
      </div>

      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {list.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={CircleCheck}
                title="当前没有未缴清企业"
                description="收款情况健康;到习惯付款日的待缴企业会自动出现在这里"
              />
            </div>
          )}
          {list.map((row) => (
            <div key={row.company.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/property/companies/${row.company.id}`} className="text-sm font-medium hover:underline">
                  {row.company.name}
                </Link>
                <StatusBadge meta={followUpSuggestionMap[row.suggestion]} />
                {row.activeRecord && <StatusBadge meta={followUpStatusMap.active} />}
                <span className="text-xs text-muted-foreground">
                  {row.company.zoneId} 区 {row.company.buildingId} 栋
                </span>
                <span className="ml-auto text-sm font-medium tabular-nums text-red-600">
                  ¥{row.arrears.amount.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({row.arrears.months} 个月)</span>
                </span>
              </div>

              {/* 三依据并列:缴费习惯 / 报事报修关单 / 投诉关单 */}
              <div className="grid gap-1.5 rounded-lg border bg-muted/30 p-3 md:grid-cols-3">
                {row.reasons.map((reason) => (
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

              {row.waivers.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">历史减免记录</p>
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-7">月份</TableHead>
                        <TableHead className="h-7">费类</TableHead>
                        <TableHead className="h-7 text-right">减免金额</TableHead>
                        <TableHead className="h-7">原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.waivers.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="py-1.5">{formatMonth(w.month)}</TableCell>
                          <TableCell className="py-1.5">{feeCategoryMap[w.category].label}</TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums">¥{w.amount.toLocaleString()}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{w.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center gap-2">
                {row.suggestion === 'collect' && !row.activeRecord && (
                  <Button
                    size="sm"
                    onClick={() => {
                      startFollowUp(row.company.id)
                      toast.success('已发起收款跟进,企业端登录将收到提醒')
                    }}
                  >
                    发起跟进
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="text-primary">
                  <Link to={`/property/companies/${row.company.id}`}>企业档案 →</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ===== Tab 3:发票管理 =====

function InvoicesTab({ scoped }: { scoped: ScopedState }) {
  const uploadInvoice = useAppStore((s) => s.uploadInvoice)
  const [month, setMonth] = useState('all')
  const [category, setCategory] = useState('all')
  const [q, setQ] = useState('')

  const [open, setOpen] = useState(false)
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formMonth, setFormMonth] = useState(CURRENT_MONTH)
  const [formCategory, setFormCategory] = useState<FeeCategory>('property')
  const [formAmount, setFormAmount] = useState('')
  const [formFileName, setFormFileName] = useState('')

  const companyName = (id: string) => scoped.companies.find((c) => c.id === id)?.name ?? id
  const months = [...lastMonths(12)].reverse()

  const rows = useMemo(() => {
    const kw = q.trim()
    return scoped.invoices
      .filter((i) => {
        if (month !== 'all' && i.month !== month) return false
        if (category !== 'all' && i.category !== category) return false
        if (kw && !companyName(i.companyId).includes(kw)) return false
        return true
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped.invoices, scoped.companies, month, category, q])

  const canUpload = formCompanyId && formMonth && formAmount && Number(formAmount) > 0 && formFileName

  const handleUpload = () => {
    uploadInvoice({
      companyId: formCompanyId,
      month: formMonth,
      category: formCategory,
      amount: Math.round(Number(formAmount)),
      fileName: formFileName,
    })
    toast.success('发票已上传,企业端「发票查询」即时可见')
    setOpen(false)
    setFormCompanyId('')
    setFormAmount('')
    setFormFileName('')
  }

  return (
    <Card className="mt-2 py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索企业" className="h-8 w-48 pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部月份</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部费类</SelectItem>
              {(Object.keys(feeCategoryMap) as FeeCategory[]).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {feeCategoryMap[cat].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
            <Upload /> 上传发票
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="没有符合条件的发票" description="试试调整筛选条件,或点击右上角上传" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">企业</TableHead>
                <TableHead>月份</TableHead>
                <TableHead>费类</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead className="max-w-56">文件名</TableHead>
                <TableHead>上传人</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="pl-4 text-sm font-medium">{companyName(inv.companyId)}</TableCell>
                  <TableCell className="tabular-nums">{formatMonth(inv.month)}</TableCell>
                  <TableCell>
                    <StatusBadge meta={feeCategoryMap[inv.category]} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">¥{inv.amount.toLocaleString()}</TableCell>
                  <TableCell className="max-w-56">
                    <p className="truncate text-xs text-muted-foreground">{inv.fileName}</p>
                  </TableCell>
                  <TableCell className="text-sm">{inv.uploadedBy}</TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{formatDateTime(inv.uploadedAt)}</TableCell>
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

      {/* 上传发票(mock:仅记录文件名与元数据入内存)*/}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传发票</DialogTitle>
            <DialogDescription>按 企业 × 月份 × 费类 归档;演示环境仅记录文件名与元数据,不上传文件内容。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">企业</Label>
              <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="选择企业" />
                </SelectTrigger>
                <SelectContent>
                  {scoped.companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">月份</Label>
                <Select value={formMonth} onValueChange={setFormMonth}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {formatMonth(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">费类</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as FeeCategory)}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(feeCategoryMap) as FeeCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {feeCategoryMap[cat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">金额(元)</Label>
              <Input
                type="number"
                min={1}
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="如:23700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">发票文件(PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFormFileName(e.target.files?.[0]?.name ?? '')}
              />
              {formFileName && <p className="text-xs text-muted-foreground">已选择:{formFileName}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button disabled={!canUpload} onClick={handleUpload}>
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
