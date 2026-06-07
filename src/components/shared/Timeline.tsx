import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface TimelineEntry {
  key: string
  title: string
  at: string
  by: string
  content?: string
}

/** 通用事件时间线(工单 / 投诉共用),最后一个节点高亮为当前状态 */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol>
      {entries.map((e, i) => {
        const isLast = i === entries.length - 1
        return (
          <li key={e.key} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'mt-1.5 size-2.5 shrink-0 rounded-full',
                  isLast ? 'bg-primary ring-4 ring-primary/15' : 'bg-muted-foreground/30',
                )}
              />
              {!isLast && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className={cn('flex-1', !isLast && 'pb-4')}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className={cn('text-sm font-medium', isLast && 'text-primary')}>{e.title}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(e.at)}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">操作人:{e.by}</p>
              {e.content && (
                <p className="mt-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-sm leading-relaxed">{e.content}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
