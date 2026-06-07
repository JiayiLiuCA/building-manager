import { DoorOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function VacantBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1 border-zinc-300 bg-zinc-100 font-normal text-zinc-600', className)}>
      <DoorOpen className="size-3" />
      空置 · 半价
    </Badge>
  )
}
