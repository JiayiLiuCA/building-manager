import { BellRing, Flag, SearchCheck } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { HouseholdCell } from '@/components/shared/HouseholdCell'
import { MoneyText } from '@/components/shared/MoneyText'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDunningRows, type DunningRow } from '@/data/selectors/dunningSelectors'
import { useAppStore } from '@/data/store'
import { formatCurrency } from '@/lib/format'
import { dunningSuggestionMap } from '@/lib/statusMaps'
import { cn } from '@/lib/utils'

const FILTERS = [
  { key: 'collect', label: '建议催缴', dot: 'bg-emerald-500' },
  { key: 'hold', label: '暂缓催缴', dot: 'bg-amber-500' },
  { key: 'verify', label: '数据待核实', dot: 'bg-zinc-400' },
  { key: 'reported', label: '已上报', dot: 'bg-red-500' },
] as const

export function DunningPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter')
  const state = useAppStore()
  const { startDunning, reportDunning } = state

  const rows = useMemo(() => getDunningRows(state), [state])

  const counts = useMemo(
    () => ({
      collect: rows.filter((r) => r.suggestion === 'collect').length,
      hold: rows.filter((r) => r.suggestion === 'hold').length,
      verify: rows.filter((r) => r.suggestion === 'verify').length,
      reported: rows.filter((r) => r.isReported).length,
    }),
    [rows],
  )
  const totalArrears = useMemo(() => rows.reduce((s, r) => s + r.arrears.amount, 0), [rows])

  const visible = useMemo(() => {
    if (!filter) return rows
    if (filter === 'reported') return rows.filter((r) => r.isReported)
    return rows.filter((r) => r.suggestion === filter)
  }, [rows, filter])

  const setFilter = (key: string) => {
    const next = new URLSearchParams(searchParams)
    if (filter === key) next.delete('filter')
    else next.set('filter', key)
    setSearchParams(next, { replace: true })
  }

  const handleStart = (row: DunningRow) => {
    startDunning(row.household.id)
    toast.success(`已对 ${row.household.householdNo} 发起催缴,业主端将收到通知弹窗`)
  }

  const handleReport = (row: DunningRow) => {
    if (!row.activeRecord) return
    reportDunning(row.activeRecord.id)
    toast.success('已标记上报:该户将出现在驾驶舱风险清单与日报风险点')
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="催缴"
        description={`共 ${rows.length} 户欠费,合计 ${formatCurrency(totalArrears)} · 系统已按服务情况给出催缴前置判断`}
      />

      {/* 三色汇总 + 已上报(点击筛选) */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FILTERS.map((f) => (
          <Card
            key={f.key}
            className={cn('cursor-pointer py-0 transition-all hover:shadow-sm', filter === f.key && 'ring-2 ring-primary')}
            onClick={() => setFilter(f.key)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <span className={cn('size-2.5 rounded-full', f.dot)} />
                <p className="text-sm">{f.label}</p>
              </div>
              <p className="text-xl font-semibold tabular-nums">{counts[f.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="p-4">
              <EmptyState title="没有符合条件的欠费户" description="试试切换上方筛选" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">户</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead className="text-right">欠费金额</TableHead>
                  <TableHead className="text-right">欠费月数</TableHead>
                  <TableHead>催缴建议</TableHead>
                  <TableHead>催缴状态</TableHead>
                  <TableHead className="w-60">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.household.id}>
                    <TableCell className="pl-4">
                      <HouseholdCell householdId={row.household.id} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.household.ownerPhone}</TableCell>
                    <TableCell className="text-right">
                      <MoneyText amount={row.arrears.amount} danger />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.arrears.months} 个月</TableCell>
                    <TableCell>
                      <StatusBadge meta={dunningSuggestionMap[row.suggestion]} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.activeRecord && (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 font-normal text-blue-700">
                            催缴中
                          </Badge>
                        )}
                        {row.isReported && (
                          <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 font-normal text-red-700">
                            <Flag className="size-3" /> 已上报
                          </Badge>
                        )}
                        {!row.activeRecord && <span className="text-sm text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {row.suggestion === 'collect' && !row.activeRecord && (
                          <Button size="sm" className="h-7" onClick={() => handleStart(row)}>
                            <BellRing /> 发起催缴
                          </Button>
                        )}
                        {row.suggestion === 'verify' && (
                          <Button asChild size="sm" variant="outline" className="h-7">
                            <Link to={`/property/households/${row.household.id}?tab=dunning`}>
                              <SearchCheck /> 去核实
                            </Link>
                          </Button>
                        )}
                        {row.activeRecord && !row.isReported && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => handleReport(row)}>
                            <Flag /> 标记上报
                          </Button>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-7 text-primary">
                          <Link to={`/property/households/${row.household.id}?tab=dunning`}>判断依据</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        * 催缴建议实时联动该户工单与投诉:<span className="text-emerald-600">建议催缴</span>
        =服务到位、无理由拖欠;<span className="text-amber-600">暂缓催缴</span>
        =存在未闭环投诉或超时工单,先解决服务问题;<span className="text-zinc-500">数据待核实</span>
        =疑似空置未登记等「假欠费」,先核实再催。
      </p>
    </div>
  )
}
