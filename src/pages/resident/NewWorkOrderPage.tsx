import { ArrowLeft, ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/data/store'
import type { WorkOrderCategory } from '@/data/types'
import { workOrderCategoryMap } from '@/lib/statusMaps'

export function NewWorkOrderPage() {
  const navigate = useNavigate()
  const createWorkOrder = useAppStore((s) => s.createWorkOrder)
  const household = useAppStore((s) => s.households.find((h) => h.id === s.currentUser?.householdId))

  const [category, setCategory] = useState<WorkOrderCategory>('plumbing')
  const [description, setDescription] = useState('')

  const submit = () => {
    const id = createWorkOrder({ category, description: description.trim() })
    if (!id) return
    toast.success(`报修已提交,工单号 ${id},物业将尽快接单`)
    navigate(`/resident/work-orders/${id}`, { replace: true })
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/resident/work-orders">
          <ArrowLeft /> 返回工单列表
        </Link>
      </Button>

      <Card className="py-0">
        <CardHeader className="border-b py-3!">
          <CardTitle className="text-sm font-medium">发起报修</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">报修房屋</Label>
            <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">{household?.householdNo}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">报修类型</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as WorkOrderCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(workOrderCategoryMap) as WorkOrderCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {workOrderCategoryMap[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">问题描述</Label>
            <Textarea
              rows={4}
              placeholder="请描述问题情况与位置,如:卫生间天花板渗水,疑似楼上管道漏水"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">现场照片(选填)</Label>
            <button
              type="button"
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted/50"
              onClick={() => toast.info('演示环境:图片上传为占位功能')}
            >
              <ImagePlus className="size-5" />
              <span className="text-xs">上传</span>
            </button>
          </div>
          <Button className="w-full" disabled={!description.trim()} onClick={submit}>
            提交报修
          </Button>
          <p className="text-center text-xs text-muted-foreground">物业承诺 48 小时内完成维修</p>
        </CardContent>
      </Card>
    </div>
  )
}
