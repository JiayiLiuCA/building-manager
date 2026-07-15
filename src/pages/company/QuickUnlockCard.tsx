import { ChevronRight, LockKeyhole } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { BatteryText } from '@/components/locks/lockUi'
import { UnlockButton } from '@/components/locks/UnlockButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useScopedData } from '@/hooks/useScopedData'
import { lockOnlineMap } from '@/lib/statusMaps'
import { StatusBadge } from '@/components/shared/StatusBadge'

const MAX_SHOWN = 3

/** 首页快捷开门卡:高频动作置顶;单元锁在前、大门在后,超过 3 把收起到门锁页 */
export function QuickUnlockCard() {
  const scoped = useScopedData()
  const locks = useMemo(
    () => [...scoped.doorLocks].sort((a, b) => (a.kind === 'unit' ? 0 : 1) - (b.kind === 'unit' ? 0 : 1)),
    [scoped.doorLocks],
  )
  if (locks.length === 0) return null
  const shown = locks.slice(0, MAX_SHOWN)

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b py-3!">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <LockKeyhole className="size-4 text-primary" /> 快捷开门
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
          <Link to="/company/locks">
            全部 {locks.length} 把 <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {shown.map((lock) => (
          <div key={lock.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{lock.name}</p>
                {lock.kind === 'building_gate' && (
                  <Badge variant="outline" className="px-1.5 py-0 text-xs font-normal text-muted-foreground">
                    楼栋大门
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge meta={lockOnlineMap[lock.isOnline ? 'online' : 'offline']} className="px-1.5 py-0 text-xs" />
                <BatteryText battery={lock.battery} className="text-xs" />
              </div>
            </div>
            <UnlockButton lock={lock} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
