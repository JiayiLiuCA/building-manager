import { ArrowLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getHouseholdWorkOrders } from '@/data/selectors/workOrderSelectors'
import { useAppStore } from '@/data/store'
import { workOrderCategoryMap } from '@/lib/statusMaps'

const NONE = '__none__'

export function NewComplaintPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = useAppStore()
  const createComplaint = useAppStore((s) => s.createComplaint)
  const householdId = state.currentUser?.householdId ?? ''

  const myWorkOrders = useMemo(() => getHouseholdWorkOrders(state, householdId), [state, householdId])

  // 从工单「转投诉」进入时预选关联工单
  const [workOrderId, setWorkOrderId] = useState(searchParams.get('workOrderId') ?? NONE)
  const [content, setContent] = useState('')

  const submit = () => {
    const id = createComplaint({
      content: content.trim(),
      workOrderId: workOrderId === NONE ? undefined : workOrderId,
    })
    if (!id) return
    toast.success(`投诉已提交(${id}),物业将派单至责任部门限期处理`)
    navigate(`/resident/complaints/${id}`, { replace: true })
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/resident/complaints">
          <ArrowLeft /> 返回投诉列表
        </Link>
      </Button>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">发起投诉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">关联工单(选填)</Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>不关联工单(独立投诉)</SelectItem>
                {myWorkOrders.map((wo) => (
                  <SelectItem key={wo.id} value={wo.id}>
                    {wo.id} · {workOrderCategoryMap[wo.category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">针对某次维修不满意时,关联对应工单便于快速定责</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">投诉内容</Label>
            <Textarea
              rows={4}
              placeholder="请描述您要投诉的问题与诉求"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={!content.trim()} onClick={submit}>
            提交投诉
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            投诉将派单至唯一责任部门限期处理;对结果不满意可申请主管介入
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
