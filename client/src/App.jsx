import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Synchronous Layouts, Core Views & Guards for Instant Routing Logic
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import TechnicianLayout from './layouts/TechnicianLayout';
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';

// Synchronous Core Admin Views for Instant Route Chunk Resolution on Hard Refresh
import AdminDashboard from './pages/admin/Dashboard';
import TicketManagement from './pages/admin/TicketManagement';
import InstallationRequests from './pages/admin/InstallationRequests';
import CustomerManagement from './pages/admin/CustomerManagement';
import TechnicianManagement from './pages/admin/TechnicianManagement';
import TechnicianApproval from './pages/admin/TechnicianApproval';
import MessengerManagement from './pages/admin/MessengerManagement';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import Reports from './pages/admin/Reports';
import Notifications from './pages/admin/Notifications';
import AuditLogs from './pages/admin/AuditLogs';
import AIRecommendations from './pages/admin/AIRecommendations';
import AdminProfile from './pages/admin/Profile';
import Settings from './pages/admin/Settings';

// Lightweight Fallback Loader for Suspense (renders nothing to prevent white/loading flashes)
const PageLoader = () => null;

// Code-Split Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const TechnicianSignUp = lazy(() => import('./pages/auth/TechnicianSignUp'));
const TechnicianPinLogin = lazy(() => import('./pages/auth/TechnicianPinLogin'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'));
const Unauthorized = lazy(() => import('./pages/auth/Unauthorized'));

// Code-Split Technician Pages
const TechDashboard = lazy(() => import('./pages/technician/Dashboard'));
const AssignedTickets = lazy(() => import('./pages/technician/AssignedTickets'));
const TicketHistory = lazy(() => import('./pages/technician/TicketHistory'));
const UpdateTicket = lazy(() => import('./pages/technician/UpdateTicket'));
const ServiceReport = lazy(() => import('./pages/technician/ServiceReport'));
const TechNotifications = lazy(() => import('./pages/technician/Notifications'));
const TechProfile = lazy(() => import('./pages/technician/Profile'));

// Code-Split Public Pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const TrackTicket = lazy(() => import('./pages/customer/TrackTicket'));
const CustomerKnowledgeBase = lazy(() => import('./pages/customer/KnowledgeBase'));

// Code-Split Error Pages
const NotFound = lazy(() => import('./pages/errors/NotFound'));

// Smart Root Route — Launched PWA goes directly to Login, Browser shows Landing Page
const RootRoute = () => {
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );

  if (isStandalone) {
    return <Navigate to="/login" replace />;
  }

  return <LandingPage />;
};

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Smart Root Route */}
        <Route path="/" element={<RootRoute />} />

        {/* Public Customer Pages */}
        <Route path="/track" element={<TrackTicket />} />
        <Route path="/kb" element={<CustomerKnowledgeBase />} />

        {/* Auth Pages */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/technician-login" element={<TechnicianPinLogin />} />
          <Route path="/pin-login" element={<TechnicianPinLogin />} />
          <Route path="/pin" element={<TechnicianPinLogin />} />
          <Route path="/technician/login" element={<TechnicianPinLogin />} />
          <Route path="/register-technician" element={<TechnicianSignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          {/* Administrator Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/installation-requests" element={<InstallationRequests />} />
              <Route path="/admin/tickets" element={<TicketManagement />} />
              <Route path="/admin/messenger" element={<MessengerManagement />} />
              <Route path="/admin/customers" element={<CustomerManagement />} />
              <Route path="/admin/technicians" element={<TechnicianManagement />} />
              <Route path="/admin/approvals" element={<TechnicianApproval />} />
              <Route path="/admin/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/analytics" element={<Navigate to="/admin/reports" replace />} />
              <Route path="/admin/ai" element={<AIRecommendations />} />
              <Route path="/admin/notifications" element={<Notifications />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Technician Routes */}
          <Route element={<RoleRoute allowedRoles={['technician']} />}>
            <Route element={<TechnicianLayout />}>
              <Route path="/technician/dashboard" element={<TechDashboard />} />
              <Route path="/technician/assigned" element={<AssignedTickets />} />
              <Route path="/technician/history" element={<TicketHistory />} />
              <Route path="/technician/update/:id" element={<UpdateTicket />} />
              <Route path="/technician/reports/new" element={<ServiceReport />} />
              <Route path="/technician/reports" element={<ServiceReport />} />
              <Route path="/technician/notifications" element={<TechNotifications />} />
              <Route path="/technician/profile" element={<TechProfile />} />
            </Route>
          </Route>
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
