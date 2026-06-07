import { CircleCheck, CircleX, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSuggestionReasons, getDunningSuggestion } from '@/data/selectors/dunningSelectors'
import { useAppStore } from '@/data/store'
import type { DunningSuggestion } from '@/data/types'
import { dunningSuggestionMap } from '@/lib/statusMaps'

const SUGGESTION_EXPLANATION: Record<DunningSuggestion, string> = {
  collect: '该户维修及时、无未闭环投诉,属于无理由拖欠 —— 可放心发起催缴。',
  hold: '该户存在未解决的服务问题,业主可能因此拒交 —— 先解决服务问题,暂不催费。',
  verify: '该户欠费数据存在异常,可能是空置未登记或数据错误造成的「假欠费」—— 先核实再决定是否催缴。',
}

/** 「为什么是这个建议」—— 催缴前置判断的逐条规则展示(核心卖点) */
export function DunningReasonCard({ householdId }: { householdId: string }) {
  const state = useAppStore()
  const suggestion = useMemo(() => getDunningSuggestion(state, householdId), [state, householdId])
  const reasons = useMemo(() => getSuggestionReasons(state, householdId), [state, householdId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          催缴前置判断
        </CardTitle>
        <StatusBadge meta={dunningSuggestionMap[suggestion]} />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{SUGGESTION_EXPLANATION[suggestion]}</p>
        <ul className="mt-3 space-y-2">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {r.hit ? (
                <CircleX className="mt-0.5 size-4 shrink-0 text-amber-500" />
              ) : (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              )}
              <span className={r.hit ? 'text-foreground' : 'text-muted-foreground'}>{r.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground/70">
          * 判断依据实时联动该户工单与投诉:解决服务问题后,建议会自动更新
        </p>
      </CardContent>
    </Card>
  )
}
