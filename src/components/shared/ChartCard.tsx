import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  /** 图下数据明细小表(显性数值要求:图上标数值 + 表内列全量) */
  table?: ReactNode
}

/** 统一高度的图表卡壳,可选携带明细小表 */
export function ChartCard({ title, description, children, table }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-[250px]">{children}</CardContent>
      {table && <div className="border-t px-4 py-3 [&_table]:text-xs">{table}</div>}
    </Card>
  )
}
