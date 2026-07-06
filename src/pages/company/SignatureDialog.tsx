import { PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { WorkOrder } from '@/data/types'

interface Props {
  workOrder: WorkOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** mock 企业电子签字:确认即关单(SIGNED + CLOSED 事件,两端状态同步) */
export function SignatureDialog({ workOrder, open, onOpenChange }: Props) {
  const scoped = useScopedData()
  const signAndCloseWorkOrder = useAppStore((s) => s.signAndCloseWorkOrder)
  const company = scoped.companies.find((c) => c.id === scoped.currentUser?.companyId)
  const signerName = company?.contactName ?? scoped.currentUser?.displayName ?? '企业'

  const confirm = () => {
    signAndCloseWorkOrder(workOrder.id)
    onOpenChange(false)
    toast.success('签字成功,工单已关单。欢迎对本次服务进行评价!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-4 text-primary" /> 企业电子签字确认
          </DialogTitle>
          <DialogDescription>
            维修人员已提交完工:「{workOrder.completionNote ?? workOrder.description}」。
            确认维修完成且无遗留问题后,请由企业对接人签字关单。
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30">
          <p className="font-serif text-4xl italic tracking-wide text-foreground/80">{signerName}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {company?.name} · 演示环境:点击下方按钮即代表手写签名确认
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            再看看
          </Button>
          <Button onClick={confirm}>确认签字并关单</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
