import { MessageSquareWarning, Plus, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { OverdueBadge } from '@/components/shared/OverdueBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { complaintCreatedAt, deriveComplaintStatus, getCompanyComplaints } from '@/data/selectors/complaintSelectors'
import { deriveWorkOrderStatus, getCompanyWorkOrders, reportedAt } from '@/data/selectors/workOrderSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatDateTime } from '@/lib/format'
import { complaintStatusMap, deptMap, getWoStatusMeta, workOrderCategoryMap } from '@/lib/statusMaps'

export function CompanyWorkOrdersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const companyId = scoped.currentUser?.companyId ?? ''
  const tab = searchParams.get('tab') === 'complaint' ? 'complaint' : 'wo'

  const workOrders = useMemo(() => getCompanyWorkOrders(scoped, companyId), [scoped, companyId])
  const complaints = useMemo(() => getCompanyComplaints(scoped, companyId), [scoped, companyId])

  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <PageHeader title="报事报修" description="报修后可随时查看派单与维修进度;对处理结果不满意可发起投诉">
        {tab === 'wo' ? (
          <Button asChild size="sm">
            <Link to="/company/work-orders/new">
              <Plus /> 发起报修
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/company/complaints/new">
              <Plus /> 发起投诉
            </Link>
          </Button>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="wo">报事报修 ({workOrders.length})</TabsTrigger>
          <TabsTrigger value="complaint">投诉 ({complaints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="wo" className="space-y-3">
          {workOrders.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="暂无报修记录"
              description="办公区设施有问题?点击右上角发起报修"
              action={
                <Button asChild size="sm">
                  <Link to="/company/work-orders/new">发起报修</Link>
                </Button>
              }
            />
          ) : (
            workOrders.map((wo) => {
              const status = deriveWorkOrderStatus(wo)
              return (
                <Card
                  key={wo.id}
                  className="cursor-pointer py-0 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/company/work-orders/${wo.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{wo.id}</span>
                      <StatusBadge meta={getWoStatusMeta(status, wo.kind)} />
                      <OverdueBadge workOrder={wo} />
                      {status === 'done_pending_sign' && (
                        <Badge className="border-violet-200 bg-violet-50 text-violet-700" variant="outline">
                          待您签字
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">{workOrderCategoryMap[wo.category]} · </span>
                      {wo.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="tabular-nums">报修 {formatDateTime(reportedAt(wo))}</span>
                      {wo.appointmentAt && <span className="tabular-nums">预约 {formatDateTime(wo.appointmentAt)}</span>}
                      {wo.satisfactionRating && (
                        <span className="flex items-center gap-1">
                          已评价 <StarRating value={wo.satisfactionRating} />
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="complaint" className="space-y-3">
          {complaints.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="暂无投诉记录"
              description="对服务不满意?点击右上角发起投诉,物业将限期处理"
              action={
                <Button asChild size="sm">
                  <Link to="/company/complaints/new">发起投诉</Link>
                </Button>
              }
            />
          ) : (
            complaints.map((c) => {
              const status = deriveComplaintStatus(c)
              return (
                <Card
                  key={c.id}
                  className="cursor-pointer py-0 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/company/complaints/${c.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                      <StatusBadge meta={complaintStatusMap[status]} />
                      {c.workOrderId && (
                        <span className="font-mono text-xs text-muted-foreground">关联 {c.workOrderId}</span>
                      )}
                      {c.responsibleDept && (
                        <span className="text-xs text-muted-foreground">{deptMap[c.responsibleDept]}</span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm">{c.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">提交 {formatDateTime(complaintCreatedAt(c))}</p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
