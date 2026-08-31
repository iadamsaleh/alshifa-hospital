import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import NewAdmissionPage from "./pages/patients/NewAdmissionPage";
import AllPatientsPage from "./pages/patients/AllPatientsPage";
import ActivePatientsPage from "./pages/patients/ActivePatientsPage";
import PatientProfilePage from "./pages/patients/PatientProfilePage";
import RoomsBedsPage from "./pages/RoomsBedsPage";
import DischargeBillingPage from "./pages/admissions/DischargeBillingPage";
import DischargeRecordViewPage from "./pages/admissions/DischargeRecordViewPage";
import DoctorListPage from "./pages/doctors/DoctorListPage";
import SchedulesPage from "./pages/doctors/SchedulesPage";
import NewOpdVisitPage from "./pages/opd/NewOpdVisitPage";
import TodaysQueuePage from "./pages/opd/TodaysQueuePage";
import OpdHistoryPage from "./pages/opd/OpdHistoryPage";
import LabTestsPage from "./pages/lab/LabTestsPage";
import NewLabInvoicePage from "./pages/lab/NewLabInvoicePage";
import LabInvoicesPage from "./pages/lab/LabInvoicesPage";
import LabInvoiceViewPage from "./pages/lab/LabInvoiceViewPage";
import LabTechnicianQueuePage from "./pages/lab/LabTechnicianQueuePage";
import EnterResultsPage from "./pages/lab/EnterResultsPage";
import LabResultViewPage from "./pages/lab/LabResultViewPage";
import PrescriptionPage from "./pages/prescriptions/PrescriptionPage";
import PrescriptionViewPage from "./pages/prescriptions/PrescriptionViewPage";
import PendingPrescriptionsPage from "./pages/prescriptions/PendingPrescriptionsPage";
import ReviewPrescriptionPage from "./pages/prescriptions/ReviewPrescriptionPage";
import PharmacyInventoryPage from "./pages/pharmacy/PharmacyInventoryPage";
import NewPharmacyInvoicePage from "./pages/pharmacy/NewPharmacyInvoicePage";
import PharmacyInvoicesPage from "./pages/pharmacy/PharmacyInvoicesPage";
import PharmacyInvoiceViewPage from "./pages/pharmacy/PharmacyInvoiceViewPage";
import StockReportPage from "./pages/pharmacy/StockReportPage";
import SettingsPage from "./pages/SettingsPage";
import { DEFAULT_ROUTE_BY_ROLE } from "./roles";

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={DEFAULT_ROUTE_BY_ROLE[user.role] || "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/lab/tests" element={<LabTestsPage />} />
            <Route path="/pharmacy/inventory" element={<PharmacyInventoryPage />} />
            <Route path="/pharmacy/invoices/new" element={<NewPharmacyInvoicePage />} />
            <Route path="/pharmacy/invoices" element={<PharmacyInvoicesPage />} />
            <Route path="/pharmacy/invoices/:id" element={<PharmacyInvoiceViewPage />} />
            <Route path="/pharmacy/reports" element={<StockReportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "DOCTOR"]} />}>
            <Route path="/prescriptions/new/:opdVisitId" element={<PrescriptionPage />} />
            <Route path="/prescriptions/pending" element={<PendingPrescriptionsPage />} />
            <Route path="/prescriptions/review/:id" element={<ReviewPrescriptionPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "RECEPTIONIST"]} />}>
            <Route path="/patients/new" element={<NewAdmissionPage />} />
            <Route path="/patients/active" element={<ActivePatientsPage />} />
            <Route path="/opd/new" element={<NewOpdVisitPage />} />
            <Route path="/rooms-beds" element={<RoomsBedsPage />} />
            <Route path="/admissions/:id/discharge" element={<DischargeBillingPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "RECEPTIONIST", "DOCTOR"]} />}>
            <Route path="/patients/all" element={<AllPatientsPage />} />
            <Route path="/patients/:id" element={<PatientProfilePage />} />
            <Route path="/doctors/list" element={<DoctorListPage />} />
            <Route path="/doctors/schedules" element={<SchedulesPage />} />
            <Route path="/opd/today" element={<TodaysQueuePage />} />
            <Route path="/opd/history" element={<OpdHistoryPage />} />
            <Route path="/prescriptions/:id" element={<PrescriptionViewPage />} />
            <Route path="/admissions/:id/discharge-record" element={<DischargeRecordViewPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "LAB_ASSISTANT"]} />}>
            <Route path="/lab/invoices/new" element={<NewLabInvoicePage />} />
            <Route path="/lab/invoices" element={<LabInvoicesPage />} />
            <Route path="/lab/invoices/:id" element={<LabInvoiceViewPage />} />
            <Route path="/lab/results/queue" element={<LabTechnicianQueuePage />} />
            <Route path="/lab/results/enter/:id" element={<EnterResultsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "RECEPTIONIST", "DOCTOR", "LAB_ASSISTANT"]} />}>
            <Route path="/lab/results/:id" element={<LabResultViewPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
