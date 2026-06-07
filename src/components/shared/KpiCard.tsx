import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string
  /** 次要说明(如 应收金额 / 时效承诺) */
  sub?: string
  icon?: LucideIcon
  /** 低于阈值告警 → 整卡红色系 */
  alert?: boolean
  alertText?: string
}

export function KpiCard({ title, value, sub, icon: Icon, alert, alertText }: KpiCardProps) {
  return (
    <Card className={cn('py-0', alert && 'border-red-200 bg-red-50/60')}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{title}</p>
          {Icon && <Icon className={cn('size-4 text-muted-foreground/60', alert && 'text-red-400')} />}
        </div>
        <p className={cn('mt-1.5 text-2xl font-semibold tracking-tight tabular-nums', alert && 'text-red-600')}>
          {value}
        </p>
        {(alert && alertText) ? (
          <p className="mt-1 text-xs font-medium text-red-600">{alertText}</p>
        ) : sub ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
