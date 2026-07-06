import { useSearchParams } from 'react-router'
import { defaultPeriodKey, type Period, type PeriodKind } from '@/lib/period'

const KINDS: PeriodKind[] = ['year', 'quarter', 'month']

/** 从 URL(?kind=&key=)读取当前期间;缺省为「本月」。经营四页共用。 */
export function usePeriodParam(): Period {
  const [params] = useSearchParams()
  const rawKind = params.get('kind') as PeriodKind | null
  const kind: PeriodKind = rawKind && KINDS.includes(rawKind) ? rawKind : 'month'
  const key = params.get('key') ?? defaultPeriodKey(kind)
  return { kind, key }
}
