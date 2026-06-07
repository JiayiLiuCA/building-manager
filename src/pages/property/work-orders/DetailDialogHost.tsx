import { useSearchParams } from 'react-router'
import { useAppStore } from '@/data/store'
import { ComplaintDetailDialog } from './ComplaintDetailDialog'
import { WorkOrderDetailDialog } from './WorkOrderDetailDialog'

/**
 * 全局详情 Modal 宿主(挂在 PropertyLayout):
 * 由 URL 的 ?detail=WO-xxx / CP-xxx 驱动 —— 任何页面(工单列表、户档案、深链)
 * 只需设置该参数即可原地打开详情,关闭后停留在原页面,不发生路由跳转。
 */
export function DetailDialogHost() {
  const [searchParams, setSearchParams] = useSearchParams()
  const detail = searchParams.get('detail')

  const workOrder = useAppStore((s) =>
    detail?.startsWith('WO-') ? s.workOrders.find((w) => w.id === detail) : undefined,
  )
  const complaint = useAppStore((s) =>
    detail?.startsWith('CP-') ? s.complaints.find((c) => c.id === detail) : undefined,
  )

  const close = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('detail')
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <WorkOrderDetailDialog workOrder={workOrder} onClose={close} />
      <ComplaintDetailDialog complaint={complaint} onClose={close} />
    </>
  )
}
