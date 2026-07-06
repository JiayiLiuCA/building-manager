import { Download, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useScopedData } from '@/hooks/useScopedData'
import type { FeeCategory } from '@/data/types'
import { formatCurrency, formatDateTime, formatMonth } from '@/lib/format'
import { feeCategoryMap } from '@/lib/statusMaps'

export function CompanyInvoicesPage() {
  const scoped = useScopedData()
  const companyId = scoped.currentUser?.companyId ?? ''

  const [month, setMonth] = useState('all')
  const [category, setCategory] = useState<'all' | FeeCategory>('all')

  const myInvoices = useMemo(
    () =>
      scoped.invoices
        .filter((i) => i.companyId === companyId)
        .sort((a, b) => b.month.localeCompare(a.month) || a.category.localeCompare(b.category)),
    [scoped.invoices, companyId],
  )
  const months = useMemo(() => [...new Set(myInvoices.map((i) => i.month))].sort().reverse(), [myInvoices])

  const filtered = myInvoices.filter(
    (i) => (month === 'all' || i.month === month) && (category === 'all' || i.category === category),
  )

  return (
    <div className="space-y-4">
      <PageHeader title="发票查询" description="账单缴清后由物业上传对应费类电子发票,可在线查看与下载(演示为示例 PDF)" />

      <Card className="py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger size="sm" className="w-36">
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
            <Select value={category} onValueChange={(v) => setCategory(v as 'all' | FeeCategory)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部费类</SelectItem>
                {(Object.keys(feeCategoryMap) as FeeCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {feeCategoryMap[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 张</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ReceiptText}
                title="暂无发票"
                description="账单缴清后 3 个工作日内,物业会上传对应发票"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">月份</TableHead>
                  <TableHead>费类</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="pl-4">{formatMonth(invoice.month)}</TableCell>
                    <TableCell>
                      <StatusBadge meta={feeCategoryMap[invoice.category]} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell className="max-w-64">
                      <p className="truncate text-xs text-muted-foreground">{invoice.fileName}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(invoice.uploadedAt)}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm" className="text-primary">
                        <a href={invoice.fileUrl ?? '/invoices/sample-1.pdf'} download={invoice.fileName}>
                          <Download className="size-3.5" /> 下载
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
    </div>
  )
}
