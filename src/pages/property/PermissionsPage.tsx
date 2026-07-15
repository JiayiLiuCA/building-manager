import { Lightbulb, RotateCcw, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/data/store'
import type { CsAssignment, CsLockAssignment } from '@/data/types'
import { lockKindMap } from '@/lib/statusMaps'

/**
 * 权限设置(仅主管,路由已守卫):为每位客服勾选 管辖企业名单 + 门锁管理范围,保存即生效 ——
 * 同一会话内切到客服账号,其驾驶舱 / 日报 / 各列表 / 门锁管理页立即随之变化(重点演示链路)。
 * 注:本页是主管专属的全量管理视图,例外允许直接读 store 的原始 companies / doorLocks(不经 scope 过滤)。
 */
export function PermissionsPage() {
  const companies = useAppStore((s) => s.companies)
  const zones = useAppStore((s) => s.zones)
  const buildings = useAppStore((s) => s.buildings)
  const doorLocks = useAppStore((s) => s.doorLocks)
  const csAssignments = useAppStore((s) => s.csAssignments)
  const csLockAssignments = useAppStore((s) => s.csLockAssignments)
  const accounts = useAppStore((s) => s.accounts)
  const setCsAssignment = useAppStore((s) => s.setCsAssignment)
  const setCsLockAssignment = useAppStore((s) => s.setCsLockAssignment)

  const buildLocal = (assignments: CsAssignment[]): Record<string, Set<string>> =>
    Object.fromEntries(assignments.map((a) => [a.csUsername, new Set(a.companyIds)]))
  const buildLocalLocks = (assignments: CsLockAssignment[]): Record<string, Set<string>> =>
    Object.fromEntries(assignments.map((a) => [a.csUsername, new Set(a.lockIds)]))

  const [local, setLocal] = useState<Record<string, Set<string>>>(() => buildLocal(csAssignments))
  const [localLocks, setLocalLocks] = useState<Record<string, Set<string>>>(() => buildLocalLocks(csLockAssignments))

  const companiesByZone = useMemo(
    () =>
      zones.map((zone) => ({
        zone,
        companies: companies.filter((c) => c.zoneId === zone.id),
      })),
    [zones, companies],
  )

  const locksByBuilding = useMemo(
    () =>
      buildings
        .map((b) => ({ building: b, locks: doorLocks.filter((l) => l.buildingId === b.id) }))
        .filter((g) => g.locks.length > 0),
    [buildings, doorLocks],
  )

  const displayName = (username: string) => accounts.find((a) => a.username === username)?.displayName ?? username

  /** 勾选互斥(通用):同一企业/同一把锁只能归属一位客服(与 store 行为一致,本地即时镜像) */
  const exclusiveToggle = (
    setState: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>,
    csUsername: string,
    id: string,
  ) => {
    setState((prev) => {
      const next: Record<string, Set<string>> = { ...prev }
      const mine = new Set(next[csUsername])
      if (mine.has(id)) {
        mine.delete(id)
      } else {
        mine.add(id)
        for (const key of Object.keys(next)) {
          if (key === csUsername) continue
          if (next[key].has(id)) {
            const other = new Set(next[key])
            other.delete(id)
            next[key] = other
          }
        }
      }
      next[csUsername] = mine
      return next
    })
  }

  const exclusiveSetAll = (
    setState: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>,
    csUsername: string,
    ids: string[],
    checked: boolean,
  ) => {
    setState((prev) => {
      const next: Record<string, Set<string>> = { ...prev }
      const mine = new Set(next[csUsername])
      for (const id of ids) {
        if (checked) {
          mine.add(id)
          for (const key of Object.keys(next)) {
            if (key === csUsername) continue
            if (next[key].has(id)) {
              const other = new Set(next[key])
              other.delete(id)
              next[key] = other
            }
          }
        } else {
          mine.delete(id)
        }
      }
      next[csUsername] = mine
      return next
    })
  }

  const save = (csUsername: string) => {
    setCsAssignment(csUsername, [...local[csUsername]])
    setCsLockAssignment(csUsername, [...(localLocks[csUsername] ?? new Set<string>())])
    // 保存后从 store 回读(互斥调整会影响其他客服名单)
    setLocal(buildLocal(useAppStore.getState().csAssignments))
    setLocalLocks(buildLocalLocks(useAppStore.getState().csLockAssignments))
    toast.success(`已保存,${displayName(csUsername)} 的驾驶舱 / 日报 / 各列表与门锁管理范围即时生效`)
  }

  const reset = () => {
    setLocal(buildLocal(csAssignments))
    setLocalLocks(buildLocalLocks(csLockAssignments))
    toast.info('已恢复为当前生效的分配')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="权限设置"
        description="为每位客服勾选管辖企业名单与门锁管理范围,保存即生效;同一企业、同一把锁只能归属一位客服"
      >
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw /> 重置为当前生效值
        </Button>
      </PageHeader>

      <Card className="border-violet-200/70 bg-violet-50/40 py-0">
        <CardContent className="flex items-start gap-2 p-3 text-sm text-violet-800">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          <p>
            推荐演示:把 <span className="font-medium">企业③ 洄澜餐饮管理(C 区)</span>从刘洋改配给王琳并保存,
            再用右上角头像菜单切换到两位客服账号 —— 驾驶舱、日报与各列表的数字会立即随管辖范围变化;
            门锁管理范围同理,未勾选的锁在客服的门锁管理页不可见、不可操作。
          </p>
        </CardContent>
      </Card>

      {csAssignments.map((assignment) => {
        const csUsername = assignment.csUsername
        const storeCount = assignment.companyIds.length
        const mine = local[csUsername] ?? new Set<string>()
        const lockAssignment = csLockAssignments.find((a) => a.csUsername === csUsername)
        const storeLockCount = lockAssignment?.lockIds.length ?? 0
        const myLocks = localLocks[csUsername] ?? new Set<string>()
        const dirtyCompanies = mine.size !== storeCount || assignment.companyIds.some((id) => !mine.has(id))
        const dirtyLocks =
          myLocks.size !== storeLockCount || (lockAssignment?.lockIds.some((id) => !myLocks.has(id)) ?? false)
        const dirty = dirtyCompanies || dirtyLocks
        return (
          <Card key={csUsername} className="py-0">
            <CardHeader className="flex flex-row flex-wrap items-center gap-2 border-b py-3!">
              <CardTitle className="text-sm font-medium">
                客服 {displayName(csUsername)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">({csUsername})</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                企业 {storeCount} 家 · 勾选 {mine.size} 家
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                门锁 {storeLockCount} 把 · 勾选 {myLocks.size} 把
              </Badge>
              <div className="ml-auto">
                <Button size="sm" disabled={!dirty} onClick={() => save(csUsername)}>
                  <Save /> 保存分配
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {companiesByZone.map(({ zone, companies: zoneCompanies }) => {
                const checkedCount = zoneCompanies.filter((c) => mine.has(c.id)).length
                return (
                  <div key={zone.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {zone.name}({checkedCount}/{zoneCompanies.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary"
                        onClick={() =>
                          exclusiveSetAll(setLocal, csUsername, zoneCompanies.map((c) => c.id), true)
                        }
                      >
                        全选
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() =>
                          exclusiveSetAll(setLocal, csUsername, zoneCompanies.map((c) => c.id), false)
                        }
                      >
                        清空
                      </Button>
                    </div>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                      {zoneCompanies.map((c) => {
                        const checkboxId = `${csUsername}-${c.id}`
                        return (
                          <div key={c.id} className="flex items-center gap-2">
                            <Checkbox
                              id={checkboxId}
                              checked={mine.has(c.id)}
                              onCheckedChange={() => exclusiveToggle(setLocal, csUsername, c.id)}
                            />
                            <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-normal">
                              {c.name}
                              <span className="ml-1 text-xs text-muted-foreground">({c.buildingId} 栋)</span>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* ===== 门锁管理范围(按楼栋分组,互斥同企业名单) ===== */}
              <Separator />
              <div>
                <p className="mb-1 text-sm font-medium">门锁管理范围</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  未勾选的锁该客服在「门锁管理」页不可见、不可操作(远程开锁 / 密码下发 / 分配回收均受限)
                </p>
                <div className="space-y-3">
                  {locksByBuilding.map(({ building, locks }) => {
                    const checkedCount = locks.filter((l) => myLocks.has(l.id)).length
                    return (
                      <div key={building.id}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {building.no}({checkedCount}/{locks.length})
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-primary"
                            onClick={() =>
                              exclusiveSetAll(setLocalLocks, csUsername, locks.map((l) => l.id), true)
                            }
                          >
                            全选
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() =>
                              exclusiveSetAll(setLocalLocks, csUsername, locks.map((l) => l.id), false)
                            }
                          >
                            清空
                          </Button>
                        </div>
                        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                          {locks.map((l) => {
                            const checkboxId = `${csUsername}-${l.id}`
                            return (
                              <div key={l.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={checkboxId}
                                  checked={myLocks.has(l.id)}
                                  onCheckedChange={() => exclusiveToggle(setLocalLocks, csUsername, l.id)}
                                />
                                <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-normal">
                                  {l.doorLabel === '大门' ? '楼栋大门' : l.doorLabel}
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    {lockKindMap[l.kind].label}
                                  </span>
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
