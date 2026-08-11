import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  Ticket, Clock, CheckCircle, AlertTriangle,
  UserCheck, ArrowRight, Sparkles, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);

ChartJS.defaults.font.family = "'Century Gothic', CenturyGothic, AppleGothic, sans-serif";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard/admin');
        if (res.success) setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <Loader text="Loading dashboard analytics..." />;

  const stats = data?.ticketStats || {};
  const recentTickets = data?.recentTickets || [];
  const pendingTechs = data?.pendingTechnicians || 0;
  const recentActivity = data?.recentActivity || [];
  const categoryStats = data?.categoryStats || [];
  const weeklyTrend = data?.weeklyTrend || [];

  const kpis = [
    { label: 'Total Tickets', value: parseInt(stats.total) || 0, subtext: 'All-time system tickets', icon: Ticket, color: 'text-cyan-400', bg: 'bg-cyan-500/20', borderColor: 'border-cyan-500' },
    { label: 'Open Tickets', value: parseInt(stats.open_tickets) || 0, subtext: 'Awaiting assignment', icon: Ticket, color: 'text-amber-400', bg: 'bg-amber-500/20', borderColor: 'border-amber-500' },
    { label: 'In Progress', value: parseInt(stats.in_progress_tickets) || 0, subtext: 'Technicians assigned', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', borderColor: 'border-blue-500' },
    { label: 'Resolved', value: parseInt(stats.resolved_tickets) || 0, subtext: 'Successfully completed', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', borderColor: 'border-emerald-500' },
    { label: 'SLA Breached', value: parseInt(stats.sla_breached) || 0, subtext: 'Exceeded deadline — act now', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/20', borderColor: 'border-rose-500', action: () => navigate('/admin/tickets') },
    { label: 'Pending Approvals', value: pendingTechs || 0, subtext: 'Technician accounts waiting', icon: UserCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/20', borderColor: 'border-indigo-500', action: () => navigate('/admin/approvals') },
  ];

  /* ── Chart Styling & Configurations ── */
  const tooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    titleColor: '#f8fafc',
    bodyColor: '#94a3b8',
    padding: 10,
    cornerRadius: 10,
  };

  // Chart 1: Bar Chart (Tickets by Category — Live Supabase Data)
  const barData = {
    labels: categoryStats.length ? categoryStats.map(c => c.name || 'Category') : ['Starlink Internet', 'CCTV System', 'Smart Devices', 'Installation'],
    datasets: [{
      label: 'Tickets',
      data: categoryStats.length ? categoryStats.map(c => parseInt(c.total) || 0) : [0, 0, 0, 0],
      backgroundColor: categoryStats.length 
        ? categoryStats.map(c => (c.color || '#06b6d4') + 'cc')
        : ['#3b82f6cc', '#8b5cf6cc', '#06b6d4cc', '#f59e0bcc'],
      borderColor: categoryStats.length 
        ? categoryStats.map(c => c.color || '#06b6d4')
        : ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } }, border: { display: false } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 } }, border: { display: false } },
    },
  };

  // Chart 2: Doughnut Chart (Status Breakdown — Live Supabase Data)
  const doughnutData = {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{
      data: [
        parseInt(stats.open_tickets) || 0,
        parseInt(stats.in_progress_tickets) || 0,
        parseInt(stats.resolved_tickets) || 0,
        parseInt(stats.closed_tickets) || 0,
      ],
      backgroundColor: ['#f59e0b99', '#3b82f699', '#10b98199', '#64748b99'],
      borderColor: ['#f59e0b', '#3b82f6', '#10b981', '#64748b'],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 14, font: { size: 11 } } },
      tooltip: { ...tooltipStyle },
    },
  };

  // Chart 3: Line Chart (Weekly Ticket Trend — Live Supabase Data)
  const lineLabels = weeklyTrend.length ? weeklyTrend.map(w => w.day) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const lineCreated = weeklyTrend.length ? weeklyTrend.map(w => parseInt(w.created_count) || 0) : [0, 0, 0, 0, 0, 0, 0];
  const lineResolved = weeklyTrend.length ? weeklyTrend.map(w => parseInt(w.resolved_count) || 0) : [0, 0, 0, 0, 0, 0, 0];

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'New Tickets',
        data: lineCreated,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.12)',
        borderWidth: 2,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Resolved',
        data: lineResolved,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointRadius: 4,
        tension: 0.4,
        fill: true,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } },
      tooltip: { ...tooltipStyle },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } }, border: { display: false } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 } }, border: { display: false } },
    },
  };

  // Chart 4: Horizontal Bar Chart (Priority Breakdown — Live Supabase Data)
  const priorityBarData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      label: 'Active Tickets',
      data: [
        parseInt(stats.critical_tickets) || 0,
        parseInt(stats.high_tickets) || 0,
        parseInt(stats.medium_tickets) || 0,
        parseInt(stats.low_tickets) || 0,
      ],
      backgroundColor: ['#f43f5ecc', '#f59e0bcc', '#06b6d4cc', '#64748bcc'],
      borderColor: ['#f43f5e', '#f59e0b', '#06b6d4', '#64748b'],
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const priorityBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipStyle },
    },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 } }, border: { display: false } },
      y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 11, weight: 'bold' } }, border: { display: false } },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Administrator Dashboard</h1>
          <p className="text-xs text-slate-400">Overview of Converge IT Solutions support operations</p>
        </div>
        {pendingTechs > 0 && (
          <Button variant="warning" onClick={() => navigate('/admin/approvals')} className="animate-pulse" icon={UserCheck}>
            {pendingTechs} Technician{pendingTechs > 1 ? 's' : ''} Pending Approval
          </Button>
        )}
      </div>

      {/* KPI — 6 Elongated Cards (Responsive Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={idx}
              onClick={kpi.action}
              className={`flex items-center gap-3 px-3.5 py-3 transition-all duration-200 border-l-4 border-t-0 border-r-0 border-b-0 ${kpi.borderColor} bg-slate-900/70 ${kpi.action ? 'cursor-pointer hover:brightness-110' : ''}`}
            >
              <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xl font-extrabold font-display leading-none ${kpi.color}`}>{kpi.value}</h3>
                <p className="text-[11px] font-semibold text-slate-200 mt-0.5 truncate">{kpi.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate leading-snug">{kpi.subtext}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 4 Connected Responsive Charts (2x2 Desktop Grid, 1x4 Mobile Stack) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Bar Chart (Tickets by Category) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display">Tickets by Category</h3>
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Category Distribution
            </span>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </Card>

        {/* Chart 2: Doughnut Chart (Status Breakdown) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display">Ticket Status Breakdown</h3>
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Status Ratio
            </span>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </Card>

        {/* Chart 3: Line Chart (Weekly Ticket Trend) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display">Weekly Ticket Activity Trend</h3>
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> 7-Day Trend
            </span>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <Line data={lineData} options={lineOptions} />
          </div>
        </Card>

        {/* Chart 4: Horizontal Bar Chart (Priority Level Distribution) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display">Priority Level Breakdown</h3>
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Priority Matrix
            </span>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <Bar data={priorityBarData} options={priorityBarOptions} />
          </div>
        </Card>
      </div>

      {/* Bottom Section: Recent Tickets & Activity Stream (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets List */}
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display">Recent Support Tickets</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tickets')}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent tickets.</p>
            ) : (
              recentTickets.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate('/admin/tickets')}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] font-bold text-cyan-400">{t.ticket_number}</span>
                    <p className="text-xs font-semibold text-slate-200 truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{t.customer_name} · {t.category_name}</p>
                  </div>
                  <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'} className="ml-2 shrink-0">
                    {t.priority}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Activity Stream */}
        <Card className="space-y-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-display">Live System Activity</h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {recentActivity.map((act, i) => (
              <div key={i} className="text-xs border-l-2 border-cyan-500/40 pl-3 py-1.5 bg-slate-900/40 rounded-r-lg">
                <p className="text-slate-200 font-medium">
                  <span className="font-bold text-cyan-300">{act.actor_name || 'System'}</span> {act.action}d {act.target_type}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{act.target_description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
