import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { AppLayout } from "./components/layout/app-layout.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Onboarding from "./pages/onboarding/page.tsx";
import AcceptInvitePage from "./pages/accept-invite/page.tsx";
import DashboardPage from "./pages/dashboard/page.tsx";
import SettingsPage from "./pages/settings/page.tsx";
import PlatformPage from "./pages/platform/page.tsx";
import PlatformOrgDetailPage from "./pages/platform/org-detail.tsx";
import CustomersPage from "./pages/customers/page.tsx";
import CustomerDetailPage from "./pages/customers/detail.tsx";
import PipelinePage from "./pages/pipeline/page.tsx";
import LeadDetailPage from "./pages/pipeline/lead-detail.tsx";
import OpportunityDetailPage from "./pages/pipeline/opportunity-detail.tsx";
import JobsPage from "./pages/jobs/page.tsx";
import JobDetailPage from "./pages/jobs/detail.tsx";

export default function App() {
  useServiceWorker();

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Onboarding (no layout) */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding/create-org" element={<Onboarding />} />
          <Route path="/invite/accept" element={<AcceptInvitePage />} />

          {/* App shell with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/pipeline/leads/:leadId" element={<LeadDetailPage />} />
            <Route path="/pipeline/opportunities/:opportunityId" element={<OpportunityDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/platform" element={<PlatformPage />} />
            <Route path="/platform/organizations/:orgId" element={<PlatformOrgDetailPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
