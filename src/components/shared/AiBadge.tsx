import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** 「AI 生成」标识 —— 凡 mock 大模型内容必挂 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1 border-violet-200 bg-violet-50 text-violet-700', className)}>
      <Sparkles className="size-3" />
      AI 生成
    </Badge>
  )
}
