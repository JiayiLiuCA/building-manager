import { Navigate, Route, Routes } from 'react-router'
import { PropertyLayout } from '@/layouts/PropertyLayout'
import { RequireRole, RootRedirect } from '@/layouts/RequireRole'
import { ResidentLayout } from '@/layouts/ResidentLayout'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DailyReportPage } from '@/pages/property/DailyReportPage'
import { DashboardPage } from '@/pages/property/DashboardPage'
import { DunningPage } from '@/pages/property/dunning/DunningPage'
import { HouseholdDossierPage } from '@/pages/property/HouseholdDossierPage'
import { PaymentsBuildingsPage } from '@/pages/property/payments/PaymentsBuildingsPage'
import { PaymentsCommunityPage } from '@/pages/property/payments/PaymentsCommunityPage'
import { PaymentsHouseholdsPage } from '@/pages/property/payments/PaymentsHouseholdsPage'
import { WorkOrdersPage } from '@/pages/property/work-orders/WorkOrdersPage'
import { AiChatPage } from '@/pages/resident/AiChatPage'
import { NewComplaintPage } from '@/pages/resident/NewComplaintPage'
import { NewWorkOrderPage } from '@/pages/resident/NewWorkOrderPage'
import { ProfilePage } from '@/pages/resident/ProfilePage'
import { ResidentComplaintDetailPage } from '@/pages/resident/ResidentComplaintDetailPage'
import { ResidentComplaintsPage } from '@/pages/resident/ResidentComplaintsPage'
import { ResidentPaymentsPage } from '@/pages/resident/ResidentPaymentsPage'
import { ResidentWorkOrderDetailPage } from '@/pages/resident/ResidentWorkOrderDetailPage'
import { ResidentWorkOrdersPage } from '@/pages/resident/ResidentWorkOrdersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* 物业端 */}
      <Route
        path="/property"
        element={
          <RequireRole role="property">
            <PropertyLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="daily-report" element={<DailyReportPage />} />
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="dunning" element={<DunningPage />} />
        <Route path="payments" element={<PaymentsCommunityPage />} />
        <Route path="payments/:communityId" element={<PaymentsBuildingsPage />} />
        <Route path="payments/:communityId/:buildingId" element={<PaymentsHouseholdsPage />} />
        <Route path="households/:householdId" element={<HouseholdDossierPage />} />
      </Route>

      {/* 业主端 */}
      <Route
        path="/resident"
        element={
          <RequireRole role="resident">
            <ResidentLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="payments" replace />} />
        <Route path="payments" element={<ResidentPaymentsPage />} />
        <Route path="work-orders" element={<ResidentWorkOrdersPage />} />
        <Route path="work-orders/new" element={<NewWorkOrderPage />} />
        <Route path="work-orders/:id" element={<ResidentWorkOrderDetailPage />} />
        <Route path="complaints" element={<ResidentComplaintsPage />} />
        <Route path="complaints/new" element={<NewComplaintPage />} />
        <Route path="complaints/:id" element={<ResidentComplaintDetailPage />} />
        <Route path="chat" element={<AiChatPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
