import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { derivePasscodeStatus } from '@/data/selectors/lockSelectors'
import { useScopedData } from '@/hooks/useScopedData'
import { DeviceTable } from './DeviceTable'
import { PasscodeTab } from './PasscodeTab'
import { RecordTable } from './RecordTable'

/** 门锁管理(物业端):设备总览 / 密码管理 / 通行记录;锁详情经 ?detail=LK-xxx 全局宿主打开 */
export function LocksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'passcode' ? 'passcode' : tabParam === 'records' ? 'records' : 'device'

  const counts = useMemo(
    () => ({
      device: scoped.doorLocks.length,
      passcode: scoped.lockPasscodes.filter((p) => derivePasscodeStatus(p) !== 'deleted').length,
    }),
    [scoped.doorLocks.length, scoped.lockPasscodes],
  )

  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    next.delete('detail')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="门锁管理"
        description="TTLock WiFi 智能门锁 · 设备状态监控 / 密码远程下发 / 通行记录准实时回传(单主账号对接,权限由本系统管控)"
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="device">设备总览 ({counts.device})</TabsTrigger>
          <TabsTrigger value="passcode">密码管理 ({counts.passcode})</TabsTrigger>
          <TabsTrigger value="records">通行记录</TabsTrigger>
        </TabsList>
        <TabsContent value="device">
          <DeviceTable />
        </TabsContent>
        <TabsContent value="passcode">
          <PasscodeTab />
        </TabsContent>
        <TabsContent value="records">
          <RecordTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
