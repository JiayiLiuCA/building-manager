import { KeyRound, LockKeyhole, UserPlus, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PasscodeCreateDialog } from '@/components/locks/PasscodeCreateDialog'
import { PasscodeTable } from '@/components/locks/PasscodeTable'
import { BatteryText, SignalText } from '@/components/locks/lockUi'
import { UnlockButton } from '@/components/locks/UnlockButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { SimplePagination } from '@/components/shared/SimplePagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { derivePasscodeStatus, isLowBattery, lockLocationLabel } from '@/data/selectors/lockSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { formatDateTime } from '@/lib/format'
import { lockKindMap, lockOnlineMap, unlockMethodMap } from '@/lib/statusMaps'

const RECORD_PAGE_SIZE = 12

/**
 * 企业端门锁页(小程序形态的 Web 映射):我的门锁(一键开门)/ 密码管理(含访客密码快捷流)/ 通行记录。
 * 范围由 scope 保证:自己的单元锁 + 本楼栋大门;大门只可开门,密码管理仅限自己的单元锁。
 */
export function CompanyLocksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const [createOpen, setCreateOpen] = useState(false)
  const [visitorOpen, setVisitorOpen] = useState(false)
  const [recordPage, setRecordPage] = useState(1)

  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'passcode' ? 'passcode' : tabParam === 'records' ? 'records' : 'locks'
  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    setSearchParams(next, { replace: true })
  }

  /** 单元锁在前、大门在后 */
  const locks = useMemo(
    () => [...scoped.doorLocks].sort((a, b) => (a.kind === 'unit' ? 0 : 1) - (b.kind === 'unit' ? 0 : 1)),
    [scoped.doorLocks],
  )
  const unitLocks = useMemo(() => locks.filter((l) => l.kind === 'unit'), [locks])
  const lockById = useMemo(() => new Map(scoped.doorLocks.map((l) => [l.id, l])), [scoped.doorLocks])

  const passcodes = useMemo(
    () =>
      scoped.lockPasscodes
        .filter((p) => derivePasscodeStatus(p) !== 'deleted')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [scoped.lockPasscodes],
  )

  const records = useMemo(
    () => [...scoped.unlockRecords].sort((a, b) => b.at.localeCompare(a.at)),
    [scoped.unlockRecords],
  )
  const recordPageCount = Math.max(1, Math.ceil(records.length / RECORD_PAGE_SIZE))
  const safeRecordPage = Math.min(recordPage, recordPageCount)
  const recordRows = records.slice((safeRecordPage - 1) * RECORD_PAGE_SIZE, safeRecordPage * RECORD_PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader
        title="门锁"
        description="一键开门 · 员工/访客密码自助管理 · 通行记录查询(仅本企业数据)"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="locks">我的门锁 ({locks.length})</TabsTrigger>
          <TabsTrigger value="passcode">密码管理 ({passcodes.length})</TabsTrigger>
          <TabsTrigger value="records">通行记录</TabsTrigger>
        </TabsList>

        {/* ===== 我的门锁 ===== */}
        <TabsContent value="locks" className="space-y-3">
          {locks.length === 0 ? (
            <EmptyState
              icon={LockKeyhole}
              title="暂无可用门锁"
              description="门锁由物业分配;如有疑问请联系物业客服或使用 AI 咨询"
            />
          ) : (
            locks.map((lock) => (
              <Card key={lock.id} className="py-0">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{lock.name}</p>
                      <StatusBadge meta={lockKindMap[lock.kind]} />
                      <StatusBadge meta={lockOnlineMap[lock.isOnline ? 'online' : 'offline']} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{lockLocationLabel(lock)}</span>
                      <BatteryText battery={lock.battery} className="text-xs" />
                      <SignalText lock={lock} />
                    </div>
                    {isLowBattery(lock) && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
                        电量不足,建议尽快更换电池
                        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                          <Link to={`/company/work-orders/new?category=door_access&desc=${encodeURIComponent(`${lock.name} 电量过低(${lock.battery}%),请安排更换电池。`)}`}>
                            <Wrench className="size-3" /> 一键报修
                          </Link>
                        </Button>
                      </p>
                    )}
                  </div>
                  <UnlockButton lock={lock} size="lg" />
                </CardContent>
              </Card>
            ))
          )}
          <p className="text-xs text-muted-foreground">
            大门锁为全楼共用,仅支持开门;密码管理请在本企业单元锁上操作。锁离线时请使用密码开门或联系物业。
          </p>
        </TabsContent>

        {/* ===== 密码管理 ===== */}
        <TabsContent value="passcode">
          <Card className="py-0">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center gap-2 border-b p-3">
                <p className="text-xs text-muted-foreground">
                  密码可发给员工或访客,在门锁键盘输入后按 # 开门;禁用可随时恢复,删除立即失效
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setVisitorOpen(true)} disabled={unitLocks.length === 0}>
                    <UserPlus /> 生成访客密码
                  </Button>
                  <Button size="sm" onClick={() => setCreateOpen(true)} disabled={unitLocks.length === 0}>
                    <KeyRound /> 新增密码
                  </Button>
                </div>
              </div>
              <PasscodeTable passcodes={passcodes} lockById={lockById} compact />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 通行记录 ===== */}
        <TabsContent value="records">
          <Card className="py-0">
            <CardContent className="p-0">
              {recordRows.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="暂无通行记录" description="本企业门锁的开门记录会准实时同步到这里" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">时间</TableHead>
                      <TableHead>门锁</TableHead>
                      <TableHead>方式</TableHead>
                      <TableHead>操作者</TableHead>
                      <TableHead>结果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordRows.map((r) => (
                      <TableRow key={r.id} className={r.success ? undefined : 'bg-red-50/60 hover:bg-red-50'}>
                        <TableCell className="pl-4 text-sm tabular-nums">{formatDateTime(r.at)}</TableCell>
                        <TableCell className="text-sm">{lockById.get(r.lockId)?.name ?? r.lockId}</TableCell>
                        <TableCell>
                          <StatusBadge meta={unlockMethodMap[r.method]} />
                        </TableCell>
                        <TableCell className="text-sm">{r.actorLabel}</TableCell>
                        <TableCell>
                          {r.success ? (
                            <span className="text-sm text-emerald-600">成功</span>
                          ) : (
                            <span className="text-sm font-medium text-red-600">失败</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <SimplePagination
                page={safeRecordPage}
                pageCount={recordPageCount}
                total={records.length}
                onChange={setRecordPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新增密码(本企业单元锁) */}
      <PasscodeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locks={unitLocks}
        forCompanyId={scoped.currentUser?.companyId}
      />
      {/* 访客密码快捷流:预填访客用途 + 今天 9:00-18:00 */}
      <PasscodeCreateDialog
        open={visitorOpen}
        onOpenChange={setVisitorOpen}
        locks={unitLocks}
        forCompanyId={scoped.currentUser?.companyId}
        visitorPreset
      />
    </div>
  )
}
