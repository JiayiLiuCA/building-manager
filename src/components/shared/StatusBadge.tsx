import { Badge } from '@/components/ui/badge'
import type { StatusMeta } from '@/lib/statusMaps'
import { cn } from '@/lib/utils'

/** 全站统一的状态徽章:配色与文案查 statusMaps,保证一致性 */
export function StatusBadge({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-normal', meta.className, className)}>
      {meta.label}
    </Badge>
  )
}
