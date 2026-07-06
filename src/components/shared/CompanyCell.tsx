import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { isRepeatComplainer } from '@/data/selectors/complaintSelectors'
import { useScopedData } from '@/hooks/useScopedData'

/** 表格中的「企业」单元格:可点击跳企业详情;反复投诉企业带旗标 */
export function CompanyCell({ companyId }: { companyId?: string }) {
  const scoped = useScopedData()
  const company = scoped.companies.find((c) => c.id === companyId)
  if (!company) return <span className="text-muted-foreground">—</span>
  const repeat = isRepeatComplainer(scoped, company.id)
  const location =
    company.occupancy.type === 'whole'
      ? `${company.buildingId} 栋 · 整栋`
      : `${company.buildingId} 栋 ${company.occupancy.unitLabel}`
  return (
    <Link to={`/property/companies/${company.id}`} onClick={(e) => e.stopPropagation()} className="group inline-block">
      <p className="text-sm leading-tight group-hover:text-primary group-hover:underline">{company.name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {location}
        {repeat && (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 px-1.5 py-0 font-normal text-orange-700">
            反复投诉
          </Badge>
        )}
      </p>
    </Link>
  )
}
