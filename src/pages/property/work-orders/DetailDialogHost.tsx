import { useSearchParams } from 'react-router'
import { useScopedData } from '@/hooks/useScopedData'
import { ComplaintDetailDialog } from './ComplaintDetailDialog'
import { WorkOrderDetailDialog } from './WorkOrderDetailDialog'

/**
 * 全局详情宿主:任何物业端页面通过 ?detail=WO-xxx / CP-xxx 原地打开详情弹窗,
 * 关闭后停留原页(不丢筛选与分页)。
 */
export function DetailDialogHost() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const detail = searchParams.get('detail')

  const close = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('detail')
    setSearchParams(next, { replace: true })
  }

  if (!detail) return null
  if (detail.startsWith('WO-')) {
    return <WorkOrderDetailDialog workOrder={scoped.workOrders.find((w) => w.id === detail)} onClose={close} />
  }
  if (detail.startsWith('CP-')) {
    return <ComplaintDetailDialog complaint={scoped.complaints.find((c) => c.id === detail)} onClose={close} />
  }
  return null
}
