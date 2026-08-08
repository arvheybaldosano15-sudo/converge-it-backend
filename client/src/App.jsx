import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import TechnicianLayout from './layouts/TechnicianLayout';

// Guards
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';

// Auth Pages
import Login from './pages/auth/Login';
import TechnicianSignUp from './pages/auth/TechnicianSignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import PendingApproval from './pages/auth/PendingApproval';
import Unauthorized from './pages/auth/Unauthorized';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import TicketManagement from './pages/admin/TicketManagement';
import MessengerManagement from './pages/admin/MessengerManagement';
import CustomerManagement from './pages/admin/CustomerManagement';
import TechnicianManagement from './pages/admin/TechnicianManagement';
import TechnicianApproval from './pages/admin/TechnicianApproval';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import Reports from './pages/admin/Reports';
import Analytics from './pages/admin/Analytics';
import Notifications from './pages/admin/Notifications';
import AuditLogs from './pages/admin/AuditLogs';
import AIRecommendations from './pages/admin/AIRecommendations';
import AdminProfile from './pages/admin/Profile';
import Settings from './pages/admin/Settings';

// Technician Pages
import TechDashboard from './pages/technician/Dashboard';
import AssignedTickets from './pages/technician/AssignedTickets';
import TicketHistory from './pages/technician/TicketHistory';
import UpdateTicket from './pages/technician/UpdateTicket';
import ServiceReport from './pages/technician/ServiceReport';
import TechNotifications from './pages/technician/Notifications';
import TechProfile from './pages/technician/Profile';

// Customer Pages
import TrackTicket from './pages/customer/TrackTicket';
import CustomerKnowledgeBase from './pages/customer/KnowledgeBase';

// Error Pages
import NotFound from './pages/errors/NotFound';
import Forbidden from './pages/errors/Forbidden';

function App() {
  return (
    <Routes>
      {/* Public Customer Pages */}
      <Route path="/track" element={<TrackTicket />} />
      <Route path="/kb" element={<CustomerKnowledgeBase />} />

      {/* Auth Pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
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
            <Route path="/admin/tickets" element={<TicketManagement />} />
            <Route path="/admin/messenger" element={<MessengerManagement />} />
            <Route path="/admin/customers" element={<CustomerManagement />} />
            <Route path="/admin/technicians" element={<TechnicianManagement />} />
            <Route path="/admin/approvals" element={<TechnicianApproval />} />
            <Route path="/admin/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/analytics" element={<Analytics />} />
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
  );
}

export default App;
