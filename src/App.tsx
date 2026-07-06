import { Navigate, Route, Routes } from 'react-router'
import { CompanyLayout } from '@/layouts/CompanyLayout'
import { PropertyLayout } from '@/layouts/PropertyLayout'
import { RequireRole, RootRedirect } from '@/layouts/RequireRole'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DailyReportPage } from '@/pages/property/DailyReportPage'
import { DashboardPage } from '@/pages/property/DashboardPage'
import { InspectionsPage } from '@/pages/property/internal/InspectionsPage'
import { MetersPage } from '@/pages/property/internal/MetersPage'
import { TasksPage } from '@/pages/property/internal/TasksPage'
import { RevenuePropertyBuildingPage } from '@/pages/property/revenue/RevenuePropertyBuildingPage'
import { RevenuePropertyPage } from '@/pages/property/revenue/RevenuePropertyPage'
import { RevenuePropertyZonePage } from '@/pages/property/revenue/RevenuePropertyZonePage'
import { RevenueUtilityPage } from '@/pages/property/revenue/RevenueUtilityPage'
import { RevenueValueAddedPage } from '@/pages/property/revenue/RevenueValueAddedPage'
import { RevenueVehiclePage } from '@/pages/property/revenue/RevenueVehiclePage'
import { MaintenancePage } from '@/pages/property/service/MaintenancePage'
import { SatisfactionPage } from '@/pages/property/service/SatisfactionPage'
import { WorkOrdersPage } from '@/pages/property/work-orders/WorkOrdersPage'

/** 占位页:各阶段逐步替换为正式页面(见 PROGRESS.md) */
function Stub({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      「{title}」页面建设中,后续阶段实现。
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* 物业端(主管 + 客服) */}
      <Route
        path="/property"
        element={
          <RequireRole roles={['supervisor', 'cs']}>
            <PropertyLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="daily-report" element={<DailyReportPage />} />
        {/* 经营管理 */}
        <Route path="revenue/property" element={<RevenuePropertyPage />} />
        <Route path="revenue/property/:zoneId" element={<RevenuePropertyZonePage />} />
        <Route path="revenue/property/:zoneId/:buildingId" element={<RevenuePropertyBuildingPage />} />
        <Route path="revenue/vehicle" element={<RevenueVehiclePage />} />
        <Route path="revenue/utility" element={<RevenueUtilityPage />} />
        <Route path="revenue/value-added" element={<RevenueValueAddedPage />} />
        {/* 服务品质 */}
        <Route path="service/work-orders" element={<WorkOrdersPage />} />
        <Route path="service/maintenance" element={<MaintenancePage />} />
        <Route path="service/satisfaction" element={<SatisfactionPage />} />
        {/* 内控管理 */}
        <Route path="internal/inspections" element={<InspectionsPage />} />
        <Route path="internal/meters" element={<MetersPage />} />
        <Route path="internal/tasks" element={<TasksPage />} />
        {/* 通知 / 企业档案 / 权限 */}
        <Route path="notices" element={<Stub title="通知管理" />} />
        <Route path="companies" element={<Stub title="企业档案" />} />
        <Route path="companies/:companyId" element={<Stub title="企业详情" />} />
        <Route
          path="permissions"
          element={
            <RequireRole roles={['supervisor']}>
              <Stub title="权限设置" />
            </RequireRole>
          }
        />
      </Route>

      {/* 企业端 */}
      <Route
        path="/company"
        element={
          <RequireRole roles={['company']}>
            <CompanyLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Stub title="企业首页" />} />
        <Route path="work-orders" element={<Stub title="报事报修" />} />
        <Route path="work-orders/new" element={<Stub title="发起报修" />} />
        <Route path="work-orders/:id" element={<Stub title="工单详情" />} />
        <Route path="complaints/new" element={<Stub title="发起投诉" />} />
        <Route path="complaints/:id" element={<Stub title="投诉详情" />} />
        <Route path="bills" element={<Stub title="账单与缴费" />} />
        <Route path="invoices" element={<Stub title="发票查询" />} />
        <Route path="survey" element={<Stub title="满意度调研" />} />
        <Route path="chat" element={<Stub title="AI 咨询" />} />
        <Route path="profile" element={<Stub title="企业信息" />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
