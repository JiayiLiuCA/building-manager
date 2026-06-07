import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FeeType } from '@/data/types'
import { lastMonths } from '@/lib/date'
import { formatMonth } from '@/lib/format'
import { feeTypeMap } from '@/lib/statusMaps'
import { cn } from '@/lib/utils'

export function MonthSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const months = [...lastMonths(12)].reverse()
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-32 bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m} value={m}>
            {formatMonth(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function FeeTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-32 bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部费用</SelectItem>
        {(Object.keys(feeTypeMap) as FeeType[]).map((ft) => (
          <SelectItem key={ft} value={ft}>
            {feeTypeMap[ft].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ExportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toast.success('导出任务已创建,稍后可在下载中心查看(演示)')}
    >
      <Download /> 导出
    </Button>
  )
}

/** 收缴率进度条:≥90% 绿 / ≥80% 橙 / <80% 红 */
export function RateBar({ rate, className }: { rate: number; className?: string }) {
  const color = rate >= 0.9 ? 'bg-emerald-500' : rate >= 0.8 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, rate * 100)}%` }} />
    </div>
  )
}

export function rateTextColor(rate: number): string {
  return rate >= 0.9 ? 'text-emerald-600' : rate >= 0.8 ? 'text-amber-600' : 'text-red-600'
}
