import { Building2, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useScopedData } from '@/hooks/useScopedData'
import { formatCurrency } from '@/lib/format'
import { paymentMethodMap } from '@/lib/statusMaps'
import { PROPERTY_FEE_RATE } from '@/data/constants'

export function CompanyProfilePage() {
  const scoped = useScopedData()
  const company = scoped.companies.find((c) => c.id === scoped.currentUser?.companyId)

  if (!company) return null

  const habit = company.paymentHabit
  const locationLabel =
    company.occupancy.type === 'whole'
      ? `${company.zoneId} 区 ${company.buildingId} 栋(整栋独占)`
      : `${company.zoneId} 区 ${company.buildingId} 栋 ${company.occupancy.unitLabel}`

  return (
    <div className="space-y-4">
      <PageHeader title="企业信息" description="信息由物业维护,如需变更请联系客服专员" />

      <Card className="py-0">
        <CardHeader className="flex flex-row items-center gap-2 border-b py-3!">
          <Building2 className="size-4 text-muted-foreground/70" />
          <CardTitle className="text-sm font-medium">基本信息(由物业维护)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <InfoItem label="企业名称" value={company.name} />
            <InfoItem label="所属行业" value={company.industry} />
            <InfoItem label="入驻位置" value={locationLabel} />
            <InfoItem label="计费面积" value={`${company.areaSqm.toLocaleString()} ㎡`} />
            <InfoItem label="联系人" value={company.contactName} />
            <InfoItem label="联系电话" value={company.contactPhone} />
            <InfoItem label="合同期" value={`${company.contractStart} ~ ${company.contractEnd}`} />
            <InfoItem
              label="月物业服务费"
              value={`${formatCurrency(company.areaSqm * PROPERTY_FEE_RATE)}(${PROPERTY_FEE_RATE} 元/㎡·月)`}
            />
            <InfoItem label="登录账号" value={scoped.currentUser?.username ?? '—'} />
          </dl>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="flex flex-row items-center gap-2 border-b py-3!">
          <CalendarClock className="size-4 text-muted-foreground/70" />
          <CardTitle className="text-sm font-medium">缴费习惯(只读)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {habit ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <InfoItem label="每月付款日" value={`每月 ${habit.payDay} 日`} />
              <InfoItem label="付款方式" value={paymentMethodMap[habit.method]} />
              {habit.note && <InfoItem label="备注" value={habit.note} />}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              贵司暂未登记缴费习惯。登记后,物业将按贵司付款节奏安排对账与提醒,如需登记请联系客服专员。
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            缴费习惯用于物业「按习惯跟进」:未到付款日不打扰,到期未到账才会提醒。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}
