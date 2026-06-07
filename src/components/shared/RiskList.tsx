import { ChevronRight, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RiskItem } from '@/data/selectors/dashboardSelectors'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'

const LEVEL_DOT: Record<RiskItem['level'], string> = {
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

/** 驾驶舱重要事项 / 风险清单,每条可点击深链跳转对应模块 */
export function RiskList({ items }: { items: RiskItem[] }) {
  const navigate = useNavigate()
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="size-4 text-red-500" />
          重要事项 / 风险清单
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {items.length} 项
        </Badge>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {items.length === 0 ? (
          <EmptyState title="暂无风险事项" description="当前经营状态良好" />
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.link)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className={cn('size-2 shrink-0 rounded-full', LEVEL_DOT[item.level])} />
                  <span className="flex-1 leading-snug">{item.text}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
