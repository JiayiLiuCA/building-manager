import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { isRepeatComplainer } from '@/data/selectors/complaintSelectors'
import { useAppStore } from '@/data/store'

/** 表格中的「户」单元格:可点击跳户档案;反复投诉户带旗标 */
export function HouseholdCell({ householdId }: { householdId: string }) {
  const household = useAppStore((s) => s.households.find((h) => h.id === householdId))
  const repeat = useAppStore((s) => isRepeatComplainer(s, householdId))
  if (!household) return <span className="text-muted-foreground">—</span>
  return (
    <Link
      to={`/property/households/${household.id}`}
      onClick={(e) => e.stopPropagation()}
      className="group inline-block"
    >
      <p className="text-sm leading-tight group-hover:text-primary group-hover:underline">{household.householdNo}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {household.ownerName}
        {repeat && (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 px-1.5 py-0 font-normal text-orange-700">
            反复投诉
          </Badge>
        )}
      </p>
    </Link>
  )
}
