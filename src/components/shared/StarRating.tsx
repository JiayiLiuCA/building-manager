import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  /** 提供 onChange 则为输入模式 */
  onChange?: (v: 1 | 2 | 3 | 4 | 5) => void
  className?: string
}

/** 1-5 星展示 / 输入两用 */
export function StarRating({ value, onChange, className }: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value
        const star = (
          <Star
            className={cn(
              onChange ? 'size-6' : 'size-3.5',
              filled ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30',
            )}
          />
        )
        return onChange ? (
          <button
            key={i}
            type="button"
            className="transition-transform hover:scale-110"
            onClick={() => onChange(i as 1 | 2 | 3 | 4 | 5)}
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        )
      })}
    </div>
  )
}
