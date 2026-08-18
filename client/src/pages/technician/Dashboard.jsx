import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Calendar,
  Activity,
  FileText,
  Eye,
  ShieldAlert,
  Zap,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { useSocket } from '../../context/SocketContext';
import { useTechDashboard } from '../../hooks/useDashboard';
import UpdateTicketModal from '../../components/technician/UpdateTicketModal';
import FileServiceReportModal from '../../components/technician/FileServiceReportModal';

// Helper for live SLA countdown calculations
const getSlaInfo = (deadlineStr, status) => {
  if (status === 'resolved' || status === 'closed') {
    return { text: 'Resolved', isBreached: false, isUrgent: false, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  }
  if (!deadlineStr) {
    return { text: 'No Target Set', isBreached: false, isUrgent: false, colorClass: 'text-slate-400 bg-slate-800/50 border-slate-700/50' };
  }

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { text: 'SLA Breached', isBreached: true, isUrgent: true, colorClass: 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const text = hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
  const isUrgent = hours < 4;

  const colorClass = isUrgent
    ? 'text-amber-400 bg-amber-500/15 border-amber-500/40'
    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

  return { text, isBreached: false, isUrgent, colorClass };
};

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  const { data = null, isLoading: loading } = useTechDashboard();

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [reportTicket, setReportTicket] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Live Timer tick every minute to update countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen for socket events to auto-update technician task queue in real-time
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'technician'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    };

    socket.on('ticket:created', handleUpdate);
    socket.on('ticket_created', handleUpdate);
    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);
    socket.on('notification:new', handleUpdate);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('ticket:created', handleUpdate);
        socket.off('ticket_created', handleUpdate);
        socket.off('ticket:updated', handleUpdate);
        socket.off('ticket_updated', handleUpdate);
        socket.off('notification:new', handleUpdate);
      }
    };
  }, [socket, queryClient]);

  const handleOpenUpdate = (ticket, e) => {
    if (e) e.stopPropagation();
    setSelectedTicket(ticket);
    setIsUpdateModalOpen(true);
  };

  const handleOpenFileReport = (ticket) => {
    setReportTicket(ticket);
    setIsReportModalOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'technician'] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  const stats = data?.stats || {};
  const completedToday = data?.completedToday || 0;
  const requiresAttention = data?.requiresAttention || [];
  const assignedQueue = data?.assignedQueue || [];
  const weeklyActivity = data?.weeklyActivity || [];
  const recentActivity = data?.recentActivity || [];

  // Donut chart data for My Workload
  const workloadData = useMemo(() => {
    const open = stats.open_tickets || 0;
    const inProgress = stats.in_progress_tickets || 0;
    const completed = stats.completed_tickets || 0;
    return [
      { name: 'Pending', value: open, color: '#f59e0b' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Completed', value: completed, color: '#10b981' },
    ];
  }, [stats]);

  const totalAssigned = stats.total_assigned || 0;

  if (loading) return <Loader text="Loading field technician workspace..." />;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white font-display">Field Technician Workspace</h1>
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold">
              LIVE WORKLOAD
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time field dispatch dashboard, active SLA countdowns, and quick service report tools
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => navigate('/technician/assigned')}>
          View Assigned Tickets <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* ── 1. KPI CARDS (Interactive & Clickable Filters) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => navigate('/technician/assigned')}
          className="flex items-center space-x-3 cursor-pointer hover:border-amber-500/50 transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Assigned</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{stats.open_tickets || 0}</h3>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/technician/assigned')}
          className="flex items-center space-x-3 cursor-pointer hover:border-blue-500/50 transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">In Progress</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{stats.in_progress_tickets || 0}</h3>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/technician/assigned')}
          className="flex items-center space-x-3 cursor-pointer hover:border-rose-500/50 transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Urgent / High</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{stats.urgent_tickets || 0}</h3>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/technician/history')}
          className="flex items-center space-x-3 cursor-pointer hover:border-emerald-500/50 transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed Today</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{completedToday}</h3>
          </div>
        </Card>
      </div>

      {/* ── 2. REQUIRES ATTENTION SECTION ── */}
      <Card glow className="space-y-4 border-rose-500/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Requires Attention</h3>
              <p className="text-[11px] text-slate-400">High-priority tasks and tickets approaching SLA deadlines</p>
            </div>
          </div>
          {requiresAttention.length > 0 && (
            <Badge variant="danger" className="animate-pulse">
              {requiresAttention.length} Urgent Task{requiresAttention.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {requiresAttention.length === 0 ? (
          <div className="p-6 text-center bg-slate-900/40 rounded-xl border border-slate-800">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-xs text-slate-300 font-medium">All high-priority tickets are in order!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No urgent or SLA-breached tasks currently assigned to you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requiresAttention.map((t) => {
              const slaInfo = getSlaInfo(t.sla_deadline, t.status);
              return (
                <div
                  key={t.id}
                  onClick={(e) => handleOpenUpdate(t, e)}
                  className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      {t.ticket_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'}>
                        {t.priority}
                      </Badge>
                      <Badge variant={t.status === 'in_progress' ? 'primary' : 'warning'}>
                        {t.status === 'open' ? 'pending' : t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {t.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{t.customer_address || 'Address on file'}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border whitespace-nowrap inline-flex items-center justify-center gap-1 ${slaInfo.colorClass}`}>
                      ⏰ {slaInfo.text}
                    </span>
                    <Button variant="ghost" size="sm" onClick={(e) => handleOpenUpdate(t, e)} icon={Eye}>
                      View Ticket
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── 3. CHARTS GRID (Workload Donut & Weekly Activity Bar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: My Workload */}
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white font-display">My Workload</h3>
            <span className="text-xs font-bold text-slate-400">{totalAssigned} Total Assigned</span>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={workloadData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {workloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Content inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white font-display">{totalAssigned}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tickets</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="block text-[10px] text-amber-400 font-bold uppercase">Pending</span>
              <span className="text-sm font-extrabold text-white">{stats.open_tickets || 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="block text-[10px] text-blue-400 font-bold uppercase">In Progress</span>
              <span className="text-sm font-extrabold text-white">{stats.in_progress_tickets || 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="block text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
              <span className="text-sm font-extrabold text-white">{stats.completed_tickets || 0}</span>
            </div>
          </div>
        </Card>

        {/* Bar Chart: Weekly Activity */}
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white font-display">Weekly Productivity</h3>
              <p className="text-[11px] text-slate-400">Completed tickets per day (Mon – Sun)</p>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }}
                />
                <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── 4. ASSIGNED SERVICE QUEUE (Priority List) ── */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white font-display">Assigned Service Queue</h3>
            <p className="text-[11px] text-slate-400">Active tasks prioritized by SLA deadline and urgency</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/technician/assigned')}>
            Manage All Assigned <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="space-y-2.5">
          {assignedQueue.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
              <Ticket className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs text-slate-400">No active assigned tickets right now.</p>
            </div>
          ) : (
            assignedQueue.map((t) => {
              const slaInfo = getSlaInfo(t.sla_deadline, t.status);
              return (
                <div
                  key={t.id}
                  onClick={(e) => handleOpenUpdate(t, e)}
                  className="p-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        {t.ticket_number}
                      </span>
                      <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'}>
                        {t.priority}
                      </Badge>
                      <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'primary' : 'warning'}>
                        {t.status === 'open' ? 'pending' : t.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] text-slate-400">({t.category_name})</span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {t.title}
                    </h4>

                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{t.customer_name} • {t.customer_address || 'Address on file'}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border whitespace-nowrap inline-flex items-center justify-center gap-1 ${slaInfo.colorClass}`}>
                      ⏰ {slaInfo.text}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => handleOpenUpdate(t, e)}
                      icon={Eye}
                    >
                      View Ticket
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ── 5. SCHEDULE & RECENT ACTIVITY GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Service Schedule */}
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-display">Today's Dispatch Schedule</h3>
            </div>
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
          </div>

          <div className="space-y-2.5">
            {assignedQueue.filter(t => t.status !== 'resolved' && t.status !== 'closed').length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No scheduled field visits remaining for today.</p>
            ) : (
              assignedQueue.filter(t => t.status !== 'resolved' && t.status !== 'closed').slice(0, 4).map((t, idx) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white">{t.ticket_number} - {t.title}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{t.customer_name} • {t.customer_address || 'Address on file'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => handleOpenUpdate(t, e)} icon={Eye} />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Activity Log */}
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-display">Recent Activity Stream</h3>
            </div>
            <span className="text-xs text-slate-400">Live Log</span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent technician activity logged yet.</p>
            ) : (
              recentActivity.map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start space-x-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200">
                      <span className="font-mono text-cyan-400 font-bold">{act.ticket_number}</span>: Status updated to{' '}
                      <strong className="text-white capitalize">{act.status_changed_to?.replace('_', ' ')}</strong>
                    </p>
                    {act.notes && <p className="text-[11px] text-slate-400 truncate italic">"{act.notes}"</p>}
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── MODALS INTEGRATION ── */}
      <UpdateTicketModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        ticket={selectedTicket}
        onSuccess={handleSuccess}
        onOpenFileServiceReport={handleOpenFileReport}
      />

      <FileServiceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        ticket={reportTicket}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default TechnicianDashboard;
