import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Synchronous Layouts & Guards for Instant Routing Logic
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import TechnicianLayout from './layouts/TechnicianLayout';
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';

// Lightweight Fallback Loader for Suspense
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
    <div className="w-9 h-9 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
    <span className="text-xs font-bold text-slate-400 font-display tracking-wider animate-pulse">
      Loading...
    </span>
  </div>
);

// Code-Split Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const TechnicianSignUp = lazy(() => import('./pages/auth/TechnicianSignUp'));
const TechnicianPinLogin = lazy(() => import('./pages/auth/TechnicianPinLogin'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'));
const Unauthorized = lazy(() => import('./pages/auth/Unauthorized'));

// Code-Split Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const TicketManagement = lazy(() => import('./pages/admin/TicketManagement'));
const InstallationRequests = lazy(() => import('./pages/admin/InstallationRequests'));
const MessengerManagement = lazy(() => import('./pages/admin/MessengerManagement'));
const CustomerManagement = lazy(() => import('./pages/admin/CustomerManagement'));
const TechnicianManagement = lazy(() => import('./pages/admin/TechnicianManagement'));
const TechnicianApproval = lazy(() => import('./pages/admin/TechnicianApproval'));
const KnowledgeBase = lazy(() => import('./pages/admin/KnowledgeBase'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AIRecommendations = lazy(() => import('./pages/admin/AIRecommendations'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const Settings = lazy(() => import('./pages/admin/Settings'));

// Code-Split Technician Pages
const TechDashboard = lazy(() => import('./pages/technician/Dashboard'));
const AssignedTickets = lazy(() => import('./pages/technician/AssignedTickets'));
const TicketHistory = lazy(() => import('./pages/technician/TicketHistory'));
const UpdateTicket = lazy(() => import('./pages/technician/UpdateTicket'));
const ServiceReport = lazy(() => import('./pages/technician/ServiceReport'));
const TechNotifications = lazy(() => import('./pages/technician/Notifications'));
const TechProfile = lazy(() => import('./pages/technician/Profile'));

// Code-Split Customer Pages
const TrackTicket = lazy(() => import('./pages/customer/TrackTicket'));
const CustomerKnowledgeBase = lazy(() => import('./pages/customer/KnowledgeBase'));

// Code-Split Error Pages
const NotFound = lazy(() => import('./pages/errors/NotFound'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Customer Pages */}
        <Route path="/track" element={<TrackTicket />} />
        <Route path="/kb" element={<CustomerKnowledgeBase />} />

        {/* Auth Pages */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/technician-login" element={<TechnicianPinLogin />} />
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

        {/* Redirect Root to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
