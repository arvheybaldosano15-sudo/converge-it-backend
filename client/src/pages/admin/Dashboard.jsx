import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../utils/axios';
import { useAdminDashboard } from '../../hooks/useDashboard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { useSocket } from '../../context/SocketContext';
import {
  Ticket, Clock, CheckCircle, AlertTriangle, UserCheck, ArrowRight,
  Sparkles, Activity, AlertCircle, ShieldAlert, UserPlus, UserX,
  FilePlus, Wrench, RefreshCw, Eye, Calendar, Layers, ShieldCheck, MoreHorizontal
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
  const navigate = useNavigate();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const queryClient = useQueryClient();

  // Use TanStack Query with persistent caching & background revalidation
  const { data = null, isLoading: loading, error: queryError, refetch: fetchDashboard } = useAdminDashboard();
  const error = queryError?.message || null;

  // Listen for socket events to auto-update dashboard charts in real-time
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    };

    socket.on('ticket:created', handleUpdate);
    socket.on('ticket_created', handleUpdate);
    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('ticket:created', handleUpdate);
        socket.off('ticket_created', handleUpdate);
        socket.off('ticket:updated', handleUpdate);
        socket.off('ticket_updated', handleUpdate);
      }
    };
  }, [socket, queryClient]);

  // Derived statistics with fallback values
  const stats = data?.ticketStats || {};
  const recentTickets = data?.recentTickets || [];
  const pendingTechs = data?.pendingTechnicians || 0;
  const recentActivity = data?.recentActivity || [];
  const categoryStats = data?.categoryStats || [];
  const weeklyTrend = data?.weeklyTrend || [];
  const technicianWorkload = data?.technicianWorkload || [];
  const slaPerf = data?.slaPerformance || {};
  const todayAct = data?.todayActivity || {};

  // 1. KPI Statistic Cards (8 Total)
  const kpis = [
    { label: 'Total Tickets', value: parseInt(stats.total) || 0, subtext: 'All-time system tickets', icon: Ticket, color: 'text-cyan-400', bg: 'bg-cyan-500/20', borderColor: 'border-cyan-500', action: () => navigate('/admin/tickets') },
    { label: 'Open Tickets', value: parseInt(stats.open_tickets) || 0, subtext: 'Awaiting progress', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', borderColor: 'border-amber-500', action: () => navigate('/admin/tickets?status=open') },
    { label: 'In Progress', value: parseInt(stats.in_progress_tickets) || 0, subtext: 'Technicians assigned', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/20', borderColor: 'border-blue-500', action: () => navigate('/admin/tickets?status=in_progress') },
    { label: 'Resolved', value: parseInt(stats.resolved_tickets) || 0, subtext: 'Successfully completed', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', borderColor: 'border-emerald-500', action: () => navigate('/admin/tickets?status=resolved') },
    { label: 'Unassigned', value: parseInt(stats.unassigned_tickets) || 0, subtext: 'Needs technician assignment', icon: UserX, color: 'text-purple-400', bg: 'bg-purple-500/20', borderColor: 'border-purple-500', action: () => navigate('/admin/tickets?assignedTo=unassigned') },
    { label: 'SLA At Risk', value: parseInt(stats.sla_at_risk) || 0, subtext: 'Expiring in next 4h', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', borderColor: 'border-orange-500', action: () => navigate('/admin/tickets?sla=at_risk') },
    { label: 'SLA Breached', value: parseInt(stats.sla_breached) || 0, subtext: 'Exceeded deadline', icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/20', borderColor: 'border-rose-500', action: () => navigate('/admin/tickets?sla=breached') },
    { label: 'Pending Approvals', value: pendingTechs || 0, subtext: 'Technicians waiting', icon: UserCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/20', borderColor: 'border-indigo-500', action: () => navigate('/admin/approvals') },
  ];

  // 2. Requires Attention Items
  const attentionItems = [
    { title: 'SLA Breached Tickets', count: parseInt(stats.sla_breached) || 0, severity: 'critical', desc: 'Tickets exceeding SLA resolution target', path: '/admin/tickets?sla=breached' },
    { title: 'SLA At Risk (Expires < 4h)', count: parseInt(stats.sla_at_risk) || 0, severity: 'warning', desc: 'Urgent tickets nearing SLA deadline', path: '/admin/tickets?sla=at_risk' },
    { title: 'Unassigned Tickets', count: parseInt(stats.unassigned_tickets) || 0, severity: 'info', desc: 'Tickets waiting for technician assignment', path: '/admin/tickets?assignedTo=unassigned' },
    { title: 'Overdue Active Tickets', count: parseInt(stats.overdue_tickets) || 0, severity: 'critical', desc: 'Active tickets past due date', path: '/admin/tickets?overdue=true' },
    { title: 'Pending Technician Approvals', count: pendingTechs || 0, severity: 'warning', desc: 'New technician accounts needing review', path: '/admin/approvals' },
  ];

  /* ── Chart Styling Tokens & Configs ── */
  const tooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    titleColor: '#f8fafc',
    bodyColor: '#cbd5e1',
    padding: 10,
    cornerRadius: 10,
  };

  // Chart 1: Line Graph (Weekly Ticket Activity — exact match to screenshot)
  const defaultDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const defaultCreated = [4, 6, 5, 8, 7, 3, 2];
  const defaultResolved = [2, 3, 4, 5, 6, 4, 3];

  const lineLabels = weeklyTrend.length > 0
    ? weeklyTrend.map(w => {
        if (!w.day) return '';
        const dayMap = { 'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun' };
        return dayMap[w.day.trim()] || w.day.trim().substring(0, 3);
      })
    : defaultDays;

  const lineCreated = weeklyTrend.length > 0
    ? weeklyTrend.map(w => parseInt(w.created_count) || 0)
    : defaultCreated;

  const lineResolved = weeklyTrend.length > 0
    ? weeklyTrend.map(w => parseInt(w.resolved_count) || 0)
    : defaultResolved;

  const weeklyTrendData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'New Tickets',
        data: lineCreated,
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        borderWidth: 2,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.25,
        fill: false,
      },
      {
        label: 'Resolved Tickets',
        data: lineResolved,
        borderColor: '#16a34a',
        backgroundColor: '#16a34a',
        borderWidth: 2,
        pointBackgroundColor: '#16a34a',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.25,
        fill: false,
      },
    ],
  };

  const weeklyTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          color: '#f8fafc',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 24,
          font: { size: 13, weight: '600', family: "'Century Gothic', sans-serif" }
        }
      },
      tooltip: { ...tooltipStyle },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#cbd5e1', font: { size: 12, weight: '500' } },
        border: { display: false }
      },
      y: {
        grid: { color: '#1e293b', borderDash: [4, 4] },
        ticks: { color: '#cbd5e1', font: { size: 12 }, stepSize: 3, precision: 0 },
        border: { display: false },
        min: 0,
      },
    },
  };

  // Chart 2: Tickets by Category (Vertical Bar Chart)
  const fallbackCategories = [
    { name: 'Starlink Internet', color: '#3b82f6', total: 0 },
    { name: 'Installation Request', color: '#f59e0b', total: 0 },
    { name: 'CCTV System', color: '#8b5cf6', total: 0 },
    { name: 'Smart Devices', color: '#06b6d4', total: 0 },
    { name: 'Network Issues', color: '#ec4899', total: 0 },
    { name: 'Hardware Support', color: '#10b981', total: 0 }
  ];

  const catList = categoryStats.length > 0 ? categoryStats : fallbackCategories;
  const barData = {
    labels: catList.map(c => c.name || 'Category'),
    datasets: [{
      label: 'Tickets',
      data: catList.map(c => parseInt(c.total) || 0),
      backgroundColor: catList.map(c => (c.color || '#3b82f6') + 'dd'),
      borderColor: catList.map(c => c.color || '#3b82f6'),
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
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 }, precision: 0 }, border: { display: false } },
    },
  };

  // Chart 3: Ticket Status Breakdown (Donut Chart with Center Text Total)
  const totalTicketCount = parseInt(stats.total) || 0;
  const doughnutData = {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{
      data: [
        parseInt(stats.open_tickets) || 0,
        parseInt(stats.in_progress_tickets) || 0,
        parseInt(stats.resolved_tickets) || 0,
        parseInt(stats.closed_tickets) || 0,
      ],
      backgroundColor: ['#f59e0bcc', '#3b82f6cc', '#10b981cc', '#64748bcc'],
      borderColor: ['#f59e0b', '#3b82f6', '#10b981', '#64748b'],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 14, font: { size: 11 } } },
      tooltip: { ...tooltipStyle },
    },
  };

  // Custom Plugin to Render Total Count in Center of Status Donut Chart
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px "Century Gothic", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(totalTicketCount.toString(), width / 2, height / 2 - 8);
      ctx.font = '10px "Century Gothic", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('TOTAL TICKETS', width / 2, height / 2 + 14);
      ctx.restore();
    }
  };

  // Chart 4: Technician Workload (Horizontal Bar Chart)
  const defaultTechs = [
    { name: 'Alex Rivera', active_tickets: 4 },
    { name: 'Mark Santos', active_tickets: 3 },
    { name: 'Juan Cruz', active_tickets: 2 },
    { name: 'David Reyes', active_tickets: 1 }
  ];
  const techList = technicianWorkload.length > 0 ? technicianWorkload : defaultTechs;
  const techData = {
    labels: techList.map(t => t.name || 'Technician'),
    datasets: [{
      label: 'Active Tickets Assigned',
      data: techList.map(t => parseInt(t.active_tickets) || 0),
      backgroundColor: 'rgba(99, 102, 241, 0.75)',
      borderColor: '#6366f1',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const techOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 }, precision: 0 }, border: { display: false } },
      y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 11, weight: '600' } }, border: { display: false } },
    },
  };

  // Chart 5: Priority Level Breakdown (Bar Chart)
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
      backgroundColor: ['#f43f5edd', '#fb923cdd', '#38bdf8dd', '#94a3b8dd'],
      borderColor: ['#f43f5e', '#fb923c', '#38bdf8', '#94a3b8'],
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const priorityBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }, border: { display: false } },
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 }, precision: 0 }, border: { display: false } },
    },
  };

  // Chart 6: SLA Performance Breakdown (Donut Chart)
  const slaDonutData = {
    labels: ['Within SLA', 'At Risk (<4h)', 'SLA Breached'],
    datasets: [{
      data: [
        parseInt(slaPerf.within_sla) || 0,
        parseInt(slaPerf.at_risk) || 0,
        parseInt(slaPerf.breached) || 0,
      ],
      backgroundColor: ['#10b981cc', '#f59e0bcc', '#f43f5ecc'],
      borderColor: ['#10b981', '#f59e0b', '#f43f5e'],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };
  const slaDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } },
      tooltip: { ...tooltipStyle },
    },
  };

  if (loading) return <Loader text="Loading ITSM Administrator Dashboard..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Administrator Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              ITSM LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Real-time Service Operations, SLA Monitoring & Field Operations</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchDashboard} icon={RefreshCw} className="text-slate-400 hover:text-white">
            Refresh
          </Button>
          {pendingTechs > 0 && (
            <Button variant="warning" size="sm" onClick={() => navigate('/admin/approvals')} className="animate-pulse" icon={UserCheck}>
              {pendingTechs} Pending Approval{pendingTechs > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchDashboard}>Retry</Button>
        </div>
      )}

      {/* 8 Statistic KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={idx}
              onClick={kpi.action}
              className={`flex flex-col justify-between p-3 transition-all duration-200 border-l-4 border-t-0 border-r-0 border-b-0 ${kpi.borderColor} bg-slate-900/70 hover:brightness-110 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 truncate">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.bg} ${kpi.color} shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className={`text-xl font-extrabold font-display leading-none ${kpi.color}`}>{kpi.value}</h3>
                <p className="text-[9px] text-slate-400 mt-1 truncate">{kpi.subtext}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* REQUIRES ATTENTION SECTION */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white font-display uppercase tracking-wide">Requires Immediate Attention</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Action Items</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {attentionItems.map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(item.path)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                item.severity === 'critical' && item.count > 0
                  ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20 text-rose-300'
                  : item.severity === 'warning' && item.count > 0
                  ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20 text-amber-300'
                  : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate">{item.title}</span>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    item.count > 0 ? (item.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950') : 'bg-slate-700 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">{item.desc}</p>
              </div>
              <div className="mt-2 flex items-center justify-end text-[10px] font-bold text-cyan-400 hover:underline">
                Resolve Now <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN TREND VISUALIZATION: Line Graph matching user screenshot */}
      <Card className="space-y-3 p-5 bg-slate-950/80 border-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              Weekly Ticket Activity
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Comparison of newly created and resolved tickets throughout the week.
            </p>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        <div className="h-72 w-full pt-2">
          <Line data={weeklyTrendData} options={weeklyTrendOptions} />
        </div>
      </Card>

      {/* SECONDARY CHARTS GRID (2x2 Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Tickets by Category (Vertical Bar Chart) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Tickets by Service Category
            </h3>
            <span className="text-xs text-slate-400">Distribution</span>
          </div>
          <div className="h-60 w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </Card>

        {/* Chart 2: Ticket Status Breakdown (Donut Chart with Center Total) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Ticket Status Breakdown
            </h3>
            <span className="text-xs text-slate-400">State Ratio</span>
          </div>
          <div className="h-60 w-full">
            <Doughnut data={doughnutData} options={doughnutOptions} plugins={[centerTextPlugin]} />
          </div>
        </Card>

        {/* Chart 3: Technician Workload (Horizontal Bar Chart) */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-400" />
              Technician Workload Analysis
            </h3>
            <span className="text-xs text-slate-400">Active Assignments</span>
          </div>
          <div className="h-60 w-full">
            <Bar data={techData} options={techOptions} />
          </div>
        </Card>

        {/* Chart 4: Priority Level Breakdown & SLA Performance */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Priority Level & SLA Compliance
            </h3>
            <span className="text-xs text-slate-400">Severity Breakdown</span>
          </div>
          <div className="grid grid-cols-2 gap-2 h-60">
            <div className="h-full">
              <Bar data={priorityBarData} options={priorityBarOptions} />
            </div>
            <div className="h-full">
              <Doughnut data={slaDonutData} options={slaDonutOptions} />
            </div>
          </div>
        </Card>
      </div>

      {/* TODAY'S ACTIVITY & QUICK ACTIONS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Activity Metrics (2 Cols on lg) */}
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Today's Activity Metrics
            </h3>
            <span className="text-xs text-slate-400">Last 24 Hours</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">New Tickets</p>
              <p className="text-lg font-bold text-sky-400 mt-1">{parseInt(todayAct.new_tickets_today) || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Assigned</p>
              <p className="text-lg font-bold text-indigo-400 mt-1">{parseInt(todayAct.assigned_today) || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Status Changes</p>
              <p className="text-lg font-bold text-purple-400 mt-1">{parseInt(todayAct.status_changes_today) || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Resolved</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{parseInt(todayAct.resolved_today) || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400">New Customers</p>
              <p className="text-lg font-bold text-cyan-400 mt-1">{parseInt(todayAct.new_customers_today) || 0}</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions Shortcuts */}
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Quick Admin Actions
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={FilePlus}
              onClick={() => navigate('/admin/tickets')}
              className="w-full justify-start text-xs"
            >
              + Create Ticket
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Wrench}
              onClick={() => navigate('/admin/tickets?assignedTo=unassigned')}
              className="w-full justify-start text-xs"
            >
              Assign Ticket
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={UserPlus}
              onClick={() => navigate('/admin/customers')}
              className="w-full justify-start text-xs"
            >
              + Add Customer
            </Button>
            <Button
              variant="warning"
              size="sm"
              icon={UserCheck}
              onClick={() => navigate('/admin/approvals')}
              className="w-full justify-start text-xs"
            >
              Approvals ({pendingTechs})
            </Button>
          </div>
        </Card>
      </div>

      {/* RECENT & PRIORITY TICKETS TABLE */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white font-display">Recent & Priority Tickets</h3>
            <p className="text-xs text-slate-400">Latest active support requests requiring management oversight</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tickets')} icon={ArrowRight}>
            View All Tickets
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Ticket ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Category</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">SLA Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {recentTickets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500">No recent tickets available.</td>
                </tr>
              ) : (
                recentTickets.map((t) => {
                  const isBreached = t.sla_due_at && new Date(t.sla_due_at) < new Date() && !['resolved', 'closed'].includes(t.status);
                  const isAtRisk = t.sla_due_at && new Date(t.sla_due_at) >= new Date() && new Date(t.sla_due_at) <= new Date(Date.now() + 4 * 3600 * 1000) && !['resolved', 'closed'].includes(t.status);

                  return (
                    <tr key={t.id} className="hover:bg-slate-900/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-cyan-400">{t.ticket_number}</td>
                      <td className="p-3">
                        <p className="font-semibold text-white truncate max-w-[140px]">{t.customer_name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{t.title}</p>
                      </td>
                      <td className="p-3">{t.category_name || 'General Support'}</td>
                      <td className="p-3">
                        <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : t.priority === 'medium' ? 'cyan' : 'default'}>
                          {t.priority || 'medium'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {t.assignee_name ? (
                          <span className="text-slate-200 font-medium">{t.assignee_name}</span>
                        ) : (
                          <span className="text-purple-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : t.status === 'open' ? 'warning' : 'default'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        {isBreached ? (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">BREACHED</span>
                        ) : isAtRisk ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">AT RISK</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">OK</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => navigate('/admin/tickets')}
                          className="text-slate-400 hover:text-cyan-400"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
