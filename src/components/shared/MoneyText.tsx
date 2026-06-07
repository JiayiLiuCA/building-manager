import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MoneyTextProps {
  amount: number
  /** 欠费等危险场景 → 红色 */
  danger?: boolean
  className?: string
}

export function MoneyText({ amount, danger, className }: MoneyTextProps) {
  return (
    <span className={cn('font-medium tabular-nums', danger && 'text-red-600', className)}>
      {formatCurrency(amount)}
    </span>
  )
}
