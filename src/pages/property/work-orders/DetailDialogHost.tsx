import { useSearchParams } from 'react-router'

/**
 * 全局详情宿主:任何物业端页面通过 ?detail=WO-xxx / CP-xxx 原地打开详情弹窗,
 * 关闭后停留原页(不丢筛选与分页)。弹窗实现见 S7(维修工单阶段)。
 */
export function DetailDialogHost() {
  const [params] = useSearchParams()
  const detail = params.get('detail')
  if (!detail) return null
  return null // TODO(S7):按 WO-/CP- 前缀分发 WorkOrderDetailDialog / ComplaintDetailDialog
}
