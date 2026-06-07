import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/data/store'
import { ComplaintTable } from './ComplaintTable'
import { WorkOrderTable } from './WorkOrderTable'

export function WorkOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'complaint' ? 'complaint' : 'wo'
  const woCount = useAppStore((s) => s.workOrders.length)
  const complaintCount = useAppStore((s) => s.complaints.length)

  const setTab = (t: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    next.delete('detail')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="工单 / 投诉" description="维修工单全流程跟踪 · 投诉派单与主管介入升级链" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="wo">维修工单 ({woCount})</TabsTrigger>
          <TabsTrigger value="complaint">投诉 ({complaintCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="wo">
          <WorkOrderTable />
        </TabsContent>
        <TabsContent value="complaint">
          <ComplaintTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
