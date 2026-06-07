import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SimplePaginationProps {
  page: number
  pageCount: number
  total: number
  onChange: (page: number) => void
}

export function SimplePagination({ page, pageCount, total, onChange }: SimplePaginationProps) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between border-t px-4 py-2.5">
      <p className="text-xs text-muted-foreground">共 {total} 条记录</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft /> 上一页
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {page} / {pageCount}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          下一页 <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
