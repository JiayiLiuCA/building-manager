import { Navigate, Route, Routes } from 'react-router'
import { CompanyLayout } from '@/layouts/CompanyLayout'
import { PropertyLayout } from '@/layouts/PropertyLayout'
import { RequireRole, RootRedirect } from '@/layouts/RequireRole'
import { CompanyBillsPage } from '@/pages/company/CompanyBillsPage'
import { CompanyChatPage } from '@/pages/company/CompanyChatPage'
import { CompanyComplaintDetailPage } from '@/pages/company/CompanyComplaintDetailPage'
import { CompanyHomePage } from '@/pages/company/CompanyHomePage'
import { CompanyInvoicesPage } from '@/pages/company/CompanyInvoicesPage'
import { CompanyLocksPage } from '@/pages/company/CompanyLocksPage'
import { CompanyProfilePage } from '@/pages/company/CompanyProfilePage'
import { CompanySurveyPage } from '@/pages/company/CompanySurveyPage'
import { CompanyWorkOrderDetailPage } from '@/pages/company/CompanyWorkOrderDetailPage'
import { CompanyWorkOrdersPage } from '@/pages/company/CompanyWorkOrdersPage'
import { NewComplaintPage } from '@/pages/company/NewComplaintPage'
import { NewWorkOrderPage } from '@/pages/company/NewWorkOrderPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { QuotationPage } from '@/pages/QuotationPage'
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
import { CompaniesPage } from '@/pages/property/companies/CompaniesPage'
import { CompanyDetailPage } from '@/pages/property/companies/CompanyDetailPage'
import { LocksPage } from '@/pages/property/locks/LocksPage'
import { NoticesPage } from '@/pages/property/notices/NoticesPage'
import { PermissionsPage } from '@/pages/property/PermissionsPage'
import { MaintenancePage } from '@/pages/property/service/MaintenancePage'
import { SatisfactionPage } from '@/pages/property/service/SatisfactionPage'
import { WorkOrdersPage } from '@/pages/property/work-orders/WorkOrdersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      {/* 项目报价单(隐藏路由:不进任何导航,直接输入 URL 访问) */}
      <Route path="/quotation" element={<QuotationPage />} />

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
        {/* 门锁 / 通知 / 企业档案 / 权限 */}
        <Route path="locks" element={<LocksPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:companyId" element={<CompanyDetailPage />} />
        <Route
          path="permissions"
          element={
            <RequireRole roles={['supervisor']}>
              <PermissionsPage />
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
        <Route path="home" element={<CompanyHomePage />} />
        <Route path="locks" element={<CompanyLocksPage />} />
        <Route path="work-orders" element={<CompanyWorkOrdersPage />} />
        <Route path="work-orders/new" element={<NewWorkOrderPage />} />
        <Route path="work-orders/:id" element={<CompanyWorkOrderDetailPage />} />
        <Route path="complaints/new" element={<NewComplaintPage />} />
        <Route path="complaints/:id" element={<CompanyComplaintDetailPage />} />
        <Route path="bills" element={<CompanyBillsPage />} />
        <Route path="invoices" element={<CompanyInvoicesPage />} />
        <Route path="survey" element={<CompanySurveyPage />} />
        <Route path="chat" element={<CompanyChatPage />} />
        <Route path="profile" element={<CompanyProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
