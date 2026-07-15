import { KeyRound, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PasscodeCreateDialog } from '@/components/locks/PasscodeCreateDialog'
import { PasscodeTable } from '@/components/locks/PasscodeTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { derivePasscodeStatus } from '@/data/selectors/lockSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import type { PasscodeStatus } from '@/data/types'
import { passcodeStatusMap } from '@/lib/statusMaps'

/** 密码管理 Tab(物业端):生成密码 + 状态筛选 + 已删除审计开关 */
export function PasscodeTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const [createOpen, setCreateOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const q = searchParams.get('pq') ?? ''
  const status = searchParams.get('pcStatus') ?? 'all'

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === 'all' || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const lockById = useMemo(() => new Map(scoped.doorLocks.map((l) => [l.id, l])), [scoped.doorLocks])
  const companyNameById = useMemo(() => new Map(scoped.companies.map((c) => [c.id, c.name])), [scoped.companies])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return scoped.lockPasscodes
      .filter((pc) => {
        const st = derivePasscodeStatus(pc)
        if (!showDeleted && st === 'deleted') return false
        if (status !== 'all' && st !== status) return false
        if (kw) {
          const lock = lockById.get(pc.lockId)
          if (!pc.name.toLowerCase().includes(kw) && !(lock?.name.toLowerCase().includes(kw) ?? false)) return false
        }
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [scoped.lockPasscodes, lockById, q, status, showDeleted])

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索密码名称 / 锁名"
              className="h-8 w-56 pl-8"
              value={q}
              onChange={(e) => setParam('pq', e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setParam('pcStatus', v)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {(Object.keys(passcodeStatusMap) as PasscodeStatus[])
                .filter((s) => showDeleted || s !== 'deleted')
                .map((s) => (
                  <SelectItem key={s} value={s}>
                    {passcodeStatusMap[s].label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={(v) => setShowDeleted(v === true)}
            />
            <Label htmlFor="show-deleted" className="cursor-pointer text-xs font-normal text-muted-foreground">
              显示已删除(审计)
            </Label>
          </div>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <KeyRound /> 生成密码
            </Button>
          </div>
        </div>
        <PasscodeTable passcodes={filtered} lockById={lockById} companyNameById={companyNameById} />
      </CardContent>
      <PasscodeCreateDialog open={createOpen} onOpenChange={setCreateOpen} locks={scoped.doorLocks} />
    </Card>
  )
}
