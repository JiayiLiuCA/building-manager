import { BellRing, CircleAlert, ClipboardList, DoorOpen, Flag, Phone, UserRound } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { DrillBreadcrumb } from '@/components/shared/DrillBreadcrumb'
import { EmptyState } from '@/components/shared/EmptyState'
import { MoneyText } from '@/components/shared/MoneyText'
import { PaymentHistory } from '@/components/shared/PaymentHistory'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { VacantBadge } from '@/components/shared/VacantBadge'
import { DunningReasonCard } from '@/pages/property/dunning/DunningReasonCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getArrears } from '@/data/selectors/billingSelectors'
import { complaintCreatedAt, deriveComplaintStatus, getHouseholdComplaints } from '@/data/selectors/complaintSelectors'
import { getActiveDunningForHousehold, getDunningSuggestion } from '@/data/selectors/dunningSelectors'
import { deriveWorkOrderStatus, getHouseholdWorkOrders, reportedAt } from '@/data/selectors/workOrderSelectors'
import { useAppStore } from '@/data/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  complaintStatusMap,
  deptMap,
  dunningSuggestionMap,
  serviceTaskTypeMap,
  workOrderCategoryMap,
  workOrderStatusMap,
} from '@/lib/statusMaps'

export function HouseholdDossierPage() {
  const { householdId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'bills'
  const state = useAppStore()

  /** 原地打开工单/投诉详情 Modal(不跳路由,关闭后停留在户档案) */
  const openDetail = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('detail', id)
    setSearchParams(next, { replace: true })
  }
  const { setVacancy, completeServiceTask, startDunning, reportDunning } = state

  const household = state.households.find((h) => h.id === householdId)
  const arrears = useMemo(() => getArrears(state, householdId), [state, householdId])
  const workOrders = useMemo(() => getHouseholdWorkOrders(state, householdId), [state, householdId])
  const complaints = useMemo(() => getHouseholdComplaints(state, householdId), [state, householdId])
  const records = useMemo(
    () =>
      state.dunningRecords
        .filter((r) => r.householdId === householdId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.dunningRecords, householdId],
  )
  const activeRecord = getActiveDunningForHousehold(state, householdId)
  const openTasks = state.serviceTasks.filter((t) => t.householdId === householdId && t.status === 'open')

  if (!household) return <Navigate to="/property/payments" replace />

  const community = state.communities.find((c) => c.id === household.communityId)
  const building = state.buildings.find((b) => b.id === household.buildingId)
  const suggestion = arrears.amount > 0 ? getDunningSuggestion(state, householdId) : null

  const handleVacancy = (next: boolean) => {
    setVacancy(household.id, next)
    toast.success(
      next ? '已登记空置:物业费转半价、未缴水电账单作废,并生成「停水停电」待办' : '已取消空置:恢复全额计费,并生成「恢复水电」待办',
    )
  }

  const handleStartDunning = () => {
    startDunning(household.id)
    toast.success('催缴已发起:业主端将收到催缴通知弹窗')
  }

  const handleReport = (recordId: string) => {
    reportDunning(recordId)
    toast.success('已标记上报:该户将出现在驾驶舱风险清单')
  }

  return (
    <div className="mx-auto max-w-6xl">
      <DrillBreadcrumb
        items={[
          { label: '全部小区', to: '/property/payments' },
          { label: community?.name ?? '', to: `/property/payments/${household.communityId}` },
          {
            label: building?.no ?? '',
            to: `/property/payments/${household.communityId}/${household.buildingId}`,
          },
          { label: `${household.roomNo} 户档案` },
        ]}
      />
      <PageHeader title={household.householdNo} description={`${household.ownerName} · ${household.ownerPhone}`}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <DoorOpen /> {household.isVacant ? '取消空置' : '设为空置'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{household.isVacant ? '取消空置登记?' : '登记为空置房屋?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {household.isVacant
                  ? '取消后该户恢复全额计费,并生成「恢复水电供应」待办事项。'
                  : '登记空置后:物业费按半价(50%)计收,水电停供不再产生费用,未缴水电账单作废;同时生成「需停水停电并记录」待办事项。'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleVacancy(!household.isVacant)}>确认</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      {household.anomaly && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
          <CircleAlert className="size-4 text-amber-600" />
          <AlertTitle>欠费数据异常:疑似空置未登记</AlertTitle>
          <AlertDescription className="text-amber-700">
            该户连续 {arrears.months} 个月欠费,且长期无水电用量记录 ——
            很可能是空置房屋未登记导致的「假欠费」。建议上门核实后登记空置(物业费转半价),避免无效催缴。
          </AlertDescription>
        </Alert>
      )}

      {openTasks.map((task) => (
        <Alert key={task.id} className="mb-4 border-blue-200 bg-blue-50 text-blue-800">
          <ClipboardList className="size-4 text-blue-600" />
          <AlertTitle>待办:{serviceTaskTypeMap[task.type]}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3 text-blue-700">
            <span>
              {task.note}({formatDateTime(task.createdAt)})
            </span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
              onClick={() => {
                completeServiceTask(task.id)
                toast.success('待办已完成并记录')
              }}
            >
              标记完成
            </Button>
          </AlertDescription>
        </Alert>
      ))}

      {/* 信息卡 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="size-3.5" /> 业主信息
            </p>
            <p className="mt-1.5 font-medium">{household.ownerName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3" /> {household.ownerPhone}
            </p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">房屋信息</p>
            <p className="mt-1.5 font-medium tabular-nums">{household.areaSqm}㎡</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {household.isVacant ? (
                <VacantBadge />
              ) : (
                <span className="text-sm text-muted-foreground">在住 · 全额计费</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">当前欠费</p>
            {arrears.amount > 0 ? (
              <>
                <p className="mt-1.5">
                  <MoneyText amount={arrears.amount} danger className="text-xl" />
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">涉及 {arrears.months} 个月账单</p>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-xl font-medium text-emerald-600">无欠费</p>
                <p className="mt-0.5 text-sm text-muted-foreground">账单全部结清</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">催缴状态</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {suggestion ? <StatusBadge meta={dunningSuggestionMap[suggestion]} /> : <span className="text-sm text-muted-foreground">无需催缴</span>}
              {activeRecord && (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 font-normal text-blue-700">
                  催缴中
                </Badge>
              )}
              {activeRecord?.isReported && (
                <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 font-normal text-red-700">
                  <Flag className="size-3" /> 已上报
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 四 Tab:账单 / 工单 / 投诉 / 催缴依据 */}
      <Tabs defaultValue={initialTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="bills">缴费记录</TabsTrigger>
          <TabsTrigger value="workOrders">工单记录 ({workOrders.length})</TabsTrigger>
          <TabsTrigger value="complaints">投诉记录 ({complaints.length})</TabsTrigger>
          <TabsTrigger value="dunning">催缴依据</TabsTrigger>
        </TabsList>

        <TabsContent value="bills">
          <PaymentHistory householdId={household.id} />
        </TabsContent>

        <TabsContent value="workOrders">
          <Card className="py-0">
            <CardContent className="p-0">
              {workOrders.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="暂无工单记录" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">工单号</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead className="max-w-60">内容</TableHead>
                      <TableHead>报修时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>业主评价</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="pl-4 font-mono text-xs">{wo.id}</TableCell>
                        <TableCell>{workOrderCategoryMap[wo.category]}</TableCell>
                        <TableCell className="max-w-60 truncate text-muted-foreground">{wo.description}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(reportedAt(wo))}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge meta={workOrderStatusMap[deriveWorkOrderStatus(wo)]} />
                            <OverdueBadge workOrder={wo} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {wo.satisfactionRating ? <StarRating value={wo.satisfactionRating} /> : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => openDetail(wo.id)}>
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
                  <EmptyState title="暂无投诉记录" />
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
                      <TableRow key={c.id}>
                        <TableCell className="pl-4 font-mono text-xs">{c.id}</TableCell>
                        <TableCell className="max-w-72 truncate text-muted-foreground">{c.content}</TableCell>
                        <TableCell className="font-mono text-xs">{c.workOrderId ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(complaintCreatedAt(c))}</TableCell>
                        <TableCell>{c.responsibleDept ? deptMap[c.responsibleDept] : '—'}</TableCell>
                        <TableCell>
                          <StatusBadge meta={complaintStatusMap[deriveComplaintStatus(c)]} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => openDetail(c.id)}>
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

        <TabsContent value="dunning" className="space-y-4">
          {arrears.amount > 0 ? (
            <>
              <DunningReasonCard householdId={household.id} />
              <div className="flex flex-wrap gap-2">
                {suggestion === 'collect' && !activeRecord && (
                  <Button size="sm" onClick={handleStartDunning}>
                    <BellRing /> 发起催缴
                  </Button>
                )}
                {activeRecord && !activeRecord.isReported && (
                  <Button size="sm" variant="outline" onClick={() => handleReport(activeRecord.id)}>
                    <Flag /> 长期欠费,标记上报
                  </Button>
                )}
              </div>
            </>
          ) : (
            <EmptyState title="该户无欠费" description="无需催缴判断" />
          )}

          {records.length > 0 && (
            <Card className="py-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">催缴单号</TableHead>
                      <TableHead>发起时间</TableHead>
                      <TableHead className="text-right">欠费快照</TableHead>
                      <TableHead className="text-right">欠费月数</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>上报</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-4 font-mono text-xs">{r.id}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(r.arrearsAmountSnapshot)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.arrearsMonthsSnapshot} 个月</TableCell>
                        <TableCell>
                          {r.status === 'active' ? (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 font-normal text-blue-700">
                              催缴中
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700">
                              已解决
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.isReported ? (
                            <span className="flex items-center gap-1 text-sm text-red-600">
                              <Flag className="size-3.5" /> {formatDateTime(r.reportedAt)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
