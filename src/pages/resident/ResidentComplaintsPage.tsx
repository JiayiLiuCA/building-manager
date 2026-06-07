import { ChevronRight, MessageSquareWarning, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { complaintCreatedAt, deriveComplaintStatus, getHouseholdComplaints } from '@/data/selectors/complaintSelectors'
import { useAppStore } from '@/data/store'
import { formatDateTime } from '@/lib/format'
import { complaintStatusMap } from '@/lib/statusMaps'

export function ResidentComplaintsPage() {
  const navigate = useNavigate()
  const state = useAppStore()
  const householdId = state.currentUser?.householdId ?? ''
  const complaints = useMemo(() => getHouseholdComplaints(state, householdId), [state, householdId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">投诉</h1>
          <p className="text-xs text-muted-foreground">对服务不满意?提交投诉,处理结果不满意可申请主管介入</p>
        </div>
        <Button asChild>
          <Link to="/resident/complaints/new">
            <Plus /> 发起投诉
          </Link>
        </Button>
      </div>

      {complaints.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="暂无投诉记录" description="您可以对服务问题提交投诉,我们将限期处理并回复" />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer py-0 transition-shadow hover:shadow-md"
              onClick={() => navigate(`/resident/complaints/${c.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                    <StatusBadge meta={complaintStatusMap[deriveComplaintStatus(c)]} />
                    {c.workOrderId && (
                      <span className="text-xs text-muted-foreground">关联 {c.workOrderId}</span>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{c.content}</p>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  提交于 {formatDateTime(complaintCreatedAt(c))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
