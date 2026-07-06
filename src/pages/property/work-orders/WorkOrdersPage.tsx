import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScopedData } from '@/hooks/useScopedData'
import { ComplaintTable } from './ComplaintTable'
import { MonthlyAnalysis } from './MonthlyAnalysis'
import { WorkOrderTable } from './WorkOrderTable'

export function WorkOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scoped = useScopedData()
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'complaint' ? 'complaint' : tabParam === 'analysis' ? 'analysis' : 'wo'
  const counts = useMemo(
    () => ({ wo: scoped.workOrders.length, complaint: scoped.complaints.length }),
    [scoped.workOrders.length, scoped.complaints.length],
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
        title="维修工单"
        description="企业报事报修 / 公共区域维修双类型全流程跟踪 · 投诉派单与主管介入升级链 · 月度集成分析"
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="wo">维修工单 ({counts.wo})</TabsTrigger>
          <TabsTrigger value="complaint">投诉 ({counts.complaint})</TabsTrigger>
          <TabsTrigger value="analysis">月度集成分析</TabsTrigger>
        </TabsList>
        <TabsContent value="wo">
          <WorkOrderTable />
        </TabsContent>
        <TabsContent value="complaint">
          <ComplaintTable />
        </TabsContent>
        <TabsContent value="analysis">
          <MonthlyAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  )
}
