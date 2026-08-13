import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  BarChart3, TrendingUp, Users, FileText, Download, FileSpreadsheet,
  Filter, Clock, Star, AlertTriangle, CheckCircle, XCircle, ShieldAlert,
  RefreshCw, Lightbulb, ChevronRight, Calendar, Activity, Target, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// ─── Shared chart defaults ───────────────────────────────────────────────────
const CHART_TOOLTIP = {
  backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#cbd5e1',
  borderColor: '#334155', borderWidth: 1, padding: 10, boxPadding: 4,
};
const AXIS_STYLE = { grid: { color: 'rgba(51,65,85,0.25)' }, ticks: { color: '#94a3b8', font: { size: 10 } } };
const LEGEND_STYLE = { labels: { color: '#94a3b8', font: { size: 11, weight: '500' }, usePointStyle: true, pointStyleWidth: 8 } };

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const Skeleton = ({ h = 'h-6', w = 'w-full', rounded = 'rounded-lg' }) => (
  <div className={`${h} ${w} ${rounded} bg-slate-800/80 animate-pulse`} />
);

const ReportsAndAnalytics = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data states ──
  const [overview, setOverview] = useState({});
  const [trend, setTrend] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [techPerformance, setTechPerformance] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);
  const [slaData, setSlaData] = useState({});

  // ── Filter state ──
  const [trendPeriod, setTrendPeriod] = useState('30');
  const [filters, setFilters] = useState({ period: '30', startDate: '', endDate: '' });
  const [appliedFilters, setAppliedFilters] = useState({ period: '30', startDate: '', endDate: '' });
  const [useCustomDate, setUseCustomDate] = useState(false);

  // ── Report generator state ──
  const [reportType, setReportType] = useState('ticket-summary');
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');

  // ─── Fetch all analytics data ────────────────────────────────────────────
  const fetchAll = useCallback(async (f = appliedFilters, showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params = f.startDate && f.endDate
        ? { startDate: f.startDate, endDate: f.endDate }
        : { period: f.period };

      const [overRes, trendRes, catRes, techRes, resTimeRes, slaRes] = await Promise.all([
        api.get('/analytics/overview', { params }),
        api.get('/analytics/tickets-trend', { params: { ...params, period: trendPeriod } }),
        api.get('/analytics/category-breakdown', { params }),
        api.get('/analytics/technician-performance', { params }),
        api.get('/analytics/response-times', { params }),
        api.get('/analytics/sla-performance', { params }),
      ]);
      if (overRes.success) setOverview(overRes.data || {});
      if (trendRes.success) setTrend(trendRes.data || []);
      if (catRes.success) setCategoryData(catRes.data || []);
      if (techRes.success) setTechPerformance(techRes.data || []);
      if (resTimeRes.success) setResponseTimes(resTimeRes.data || []);
      if (slaRes.success) setSlaData(slaRes.data || {});
    } catch (e) {
      console.error(e);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedFilters, trendPeriod]);

  useEffect(() => { fetchAll(); }, []);

  // Re-fetch trend when trendPeriod changes
  useEffect(() => {
    const params = appliedFilters.startDate && appliedFilters.endDate
      ? { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate }
      : { period: trendPeriod };
    api.get('/analytics/tickets-trend', { params }).then((r) => { if (r.success) setTrend(r.data || []); }).catch(() => {});
  }, [trendPeriod]);

  const applyFilters = () => {
    const f = { ...filters };
    setAppliedFilters(f);
    fetchAll(f, true);
  };

  const resetFilters = () => {
    const def = { period: '30', startDate: '', endDate: '' };
    setFilters(def);
    setAppliedFilters(def);
    setTrendPeriod('30');
    setUseCustomDate(false);
    fetchAll(def, true);
  };

  const tOverview = overview.tickets || {};
  const techOverview = overview.technicians || {};
  const satOverview = overview.satisfaction || {};

  // ─── SLA compliance rate ─────────────────────────────────────────────────
  const slaTotal = parseInt(slaData.within_sla || 0) + parseInt(slaData.at_risk || 0) + parseInt(slaData.breached || 0);
  const slaRate = slaTotal > 0 ? Math.round((parseInt(slaData.within_sla || 0) / slaTotal) * 100) : null;

  // ─── Insights ────────────────────────────────────────────────────────────
  const insights = [];
  if (categoryData.length > 0) {
    const top = categoryData[0];
    if (parseInt(top.total) > 0) insights.push({ icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', text: `"${top.name}" is the busiest service category with ${top.total} tickets in the selected period.` });
  }
  if (parseInt(slaData.breached || 0) > 0) {
    insights.push({ icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10', text: `${slaData.breached} ticket(s) have breached SLA — immediate attention required.` });
  }
  if (techPerformance.length > 0) {
    const busiest = techPerformance.reduce((a, b) => parseInt(a.active) > parseInt(b.active) ? a : b, techPerformance[0]);
    if (parseInt(busiest.active) > 0) insights.push({ icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', text: `${busiest.full_name} has the highest active workload with ${busiest.active} open tickets.` });
  }
  if (responseTimes.length > 0) {
    const slowest = responseTimes.reduce((a, b) => parseFloat(a.avg_resolution_hours || 0) > parseFloat(b.avg_resolution_hours || 0) ? a : b, responseTimes[0]);
    if (parseFloat(slowest.avg_resolution_hours || 0) > 0) insights.push({ icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', text: `"${slowest.priority?.toUpperCase()}" priority tickets have the longest average resolution time at ${parseFloat(slowest.avg_resolution_hours).toFixed(1)}h.` });
  }
  if (trend.length >= 2) {
    const last = parseInt(trend[trend.length - 1]?.created || 0);
    const prev = parseInt(trend[trend.length - 2]?.created || 0);
    if (last > prev) insights.push({ icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: `Ticket volume is trending up — ${last} tickets created on the latest recorded day vs ${prev} the day before.` });
  }

  // ─── Chart: Ticket Volume Trend (Line) ───────────────────────────────────
  const lineData = {
    labels: trend.map((t) => new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })),
    datasets: [
      { label: 'Created', data: trend.map((t) => parseInt(t.created || 0)), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#2563eb', pointRadius: 4, pointHoverRadius: 6 },
      { label: 'Resolved', data: trend.map((t) => parseInt(t.resolved || 0)), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#16a34a', pointRadius: 4, pointHoverRadius: 6 }
    ]
  };
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP },
    scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true, ticks: { ...AXIS_STYLE.ticks, stepSize: 1 } } }
  };

  // ─── Chart: Ticket Status Breakdown (Donut) ───────────────────────────────
  const statusTotal = parseInt(tOverview.open || 0) + parseInt(tOverview.in_progress || 0) + parseInt(tOverview.resolved || 0) + parseInt(tOverview.closed || 0);
  const donutData = {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{ data: [tOverview.open || 0, tOverview.in_progress || 0, tOverview.resolved || 0, tOverview.closed || 0], backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#64748b'], borderWidth: 2, borderColor: '#070b1e', hoverOffset: 6 }]
  };
  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: {
      legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP,
      beforeDraw: (chart) => { /* center text drawn via plugin */ }
    }
  };

  // ─── Chart: Category Bar ─────────────────────────────────────────────────
  const CAT_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'];
  const catBarData = {
    labels: categoryData.map((c) => c.name),
    datasets: [
      { label: 'Total Tickets', data: categoryData.map((c) => parseInt(c.total || 0)), backgroundColor: categoryData.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]), borderRadius: 6, borderWidth: 0 },
      { label: 'Resolved', data: categoryData.map((c) => parseInt(c.resolved || 0)), backgroundColor: categoryData.map((_, i) => CAT_COLORS[i % CAT_COLORS.length] + '60'), borderRadius: 6, borderWidth: 0 }
    ]
  };
  const catBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP },
    scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true } }
  };

  // ─── Chart: SLA Performance (Bar) ────────────────────────────────────────
  const slaBarData = {
    labels: ['Within SLA', 'At Risk', 'SLA Breached'],
    datasets: [{ label: 'Tickets', data: [slaData.within_sla || 0, slaData.at_risk || 0, slaData.breached || 0], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderRadius: 6, borderWidth: 0 }]
  };
  const slaBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP },
    scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true, ticks: { ...AXIS_STYLE.ticks, stepSize: 1 } } }
  };

  // ─── Chart: Technician Productivity (Horizontal Bar) ─────────────────────
  const techBarData = {
    labels: techPerformance.map((tp) => tp.full_name?.split(' ')[0] || 'N/A'),
    datasets: [
      { label: 'Completed', data: techPerformance.map((tp) => parseInt(tp.completed || 0)), backgroundColor: '#10b981', borderRadius: 4, borderWidth: 0 },
      { label: 'Active', data: techPerformance.map((tp) => parseInt(tp.active || 0)), backgroundColor: '#3b82f6', borderRadius: 4, borderWidth: 0 }
    ]
  };
  const techBarOptions = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP },
    scales: { x: { ...AXIS_STYLE, beginAtZero: true }, y: AXIS_STYLE }
  };

  // ─── Chart: Resolution Time by Priority (Horizontal Bar) ─────────────────
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  const sortedRT = [...responseTimes].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
  const rtBarData = {
    labels: sortedRT.map((r) => r.priority?.toUpperCase() || ''),
    datasets: [{ label: 'Avg Resolution (hrs)', data: sortedRT.map((r) => parseFloat(r.avg_resolution_hours || 0)), backgroundColor: sortedRT.map((r) => PRIORITY_COLORS[r.priority] || '#64748b'), borderRadius: 4, borderWidth: 0 }]
  };
  const rtBarOptions = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP },
    scales: { x: { ...AXIS_STYLE, beginAtZero: true }, y: AXIS_STYLE }
  };

  const handleDownloadPDF = () => { window.open(`/api/reports/download/pdf?${new URLSearchParams({ reportType, startDate: reportStart, endDate: reportEnd }).toString()}`, '_blank'); toast.success('PDF download initiated'); };
  const handleDownloadExcel = () => { window.open(`/api/reports/download/excel?${new URLSearchParams({ startDate: reportStart, endDate: reportEnd }).toString()}`, '_blank'); toast.success('Excel download initiated'); };
  const handleDownloadCSV = () => { window.open(`/api/reports/download/csv?${new URLSearchParams({ reportType, startDate: reportStart, endDate: reportEnd }).toString()}`, '_blank'); toast.success('CSV download initiated'); };

  const drillTo = (filterKey, filterVal) => navigate(`/admin/tickets?${filterKey}=${filterVal}`);

  // ─── KPI Cards config ────────────────────────────────────────────────────
  const kpiCards = [
    { label: 'Total Tickets', value: tOverview.total || 0, sub: `Open: ${tOverview.open || 0}  In Progress: ${tOverview.in_progress || 0}`, icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', onClick: () => drillTo('status', 'all') },
    { label: 'Avg Resolution', value: tOverview.avg_resolution_hours ? `${parseFloat(tOverview.avg_resolution_hours).toFixed(1)}h` : '—', sub: `Target: < 24h`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'SLA Compliance', value: slaRate !== null ? `${slaRate}%` : '—', sub: `${slaData.breached || 0} breached  ${slaData.at_risk || 0} at risk`, icon: Target, color: slaRate !== null && slaRate < 80 ? 'text-rose-400' : 'text-emerald-400', bg: slaRate !== null && slaRate < 80 ? 'bg-rose-500/10' : 'bg-emerald-500/10', border: slaRate !== null && slaRate < 80 ? 'border-rose-500/20' : 'border-emerald-500/20', onClick: () => drillTo('slaStatus', 'breached') },
    { label: 'CSAT Rating', value: satOverview.avg_rating ? `${satOverview.avg_rating}/5` : '—', sub: `From ${satOverview.total_feedback || 0} reviews`, icon: Star, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: 'Active Techs', value: techOverview.active || 0, sub: `${techOverview.pending || 0} pending approval`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', onClick: () => navigate('/admin/technicians') },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Reports & Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Interactive operational metrics, performance trends, and custom report exports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => fetchAll(appliedFilters, true)} className={`text-slate-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`}>Refresh</Button>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[{ key: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 }, { key: 'reports', label: 'Report Generator', icon: FileText }].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* ── Global Filter Bar ── */}
          <Card className="p-4 bg-slate-950/70 border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
                <Filter className="w-4 h-4 text-cyan-400" /> Analytics Filters
              </div>

              {/* Quick date pills */}
              <div className="flex flex-wrap gap-1.5">
                {[{ label: 'Today', val: '1' }, { label: '7 Days', val: '7' }, { label: '30 Days', val: '30' }, { label: '90 Days', val: '90' }, { label: 'This Year', val: '365' }].map((d) => (
                  <button key={d.val} onClick={() => { setFilters({ period: d.val, startDate: '', endDate: '' }); setUseCustomDate(false); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filters.period === d.val && !useCustomDate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white border border-slate-800'}`}>
                    {d.label}
                  </button>
                ))}
                <button onClick={() => setUseCustomDate(!useCustomDate)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${useCustomDate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white border border-slate-800'}`}>
                  <Calendar className="w-3 h-3" /> Custom
                </button>
              </div>

              {useCustomDate && (
                <div className="flex items-center gap-2">
                  <input type="date" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, period: '' }))}
                    className="glass-input rounded-lg py-1 px-2 text-xs border-slate-700 bg-slate-900 text-white" />
                  <span className="text-slate-500 text-xs">to</span>
                  <input type="date" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, period: '' }))}
                    className="glass-input rounded-lg py-1 px-2 text-xs border-slate-700 bg-slate-900 text-white" />
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-slate-400 hover:text-rose-400">Reset</Button>
                <Button variant="primary" size="sm" onClick={applyFilters} className="text-xs">Apply Filters</Button>
              </div>
            </div>
          </Card>

          {/* ── 5 KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {loading ? Array.from({ length: 5 }).map((_, i) => <Card key={i} className="p-4"><Skeleton h="h-12" /></Card>)
              : kpiCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <Card key={i} onClick={card.onClick} className={`p-3 flex items-center gap-2.5 ${card.onClick ? 'cursor-pointer hover:bg-slate-800/60 transition-colors' : ''}`}>
                    <div className={`p-2 rounded-xl ${card.bg} ${card.color} border ${card.border} shrink-0`}><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{card.label}</p>
                      <h3 className={`text-sm sm:text-base font-extrabold font-display leading-none mt-0.5 ${card.color}`}>{card.value}</h3>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">{card.sub}</p>
                    </div>
                    {card.onClick && <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0" />}
                  </Card>
                );
              })}
          </div>

          {/* ── Row 1: Trend Line + Status Donut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 space-y-3 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" /> Ticket Volume Trend</h3>
                <div className="flex gap-1">
                  {[{ label: '7D', val: '7' }, { label: '30D', val: '30' }, { label: '90D', val: '90' }].map((p) => (
                    <button key={p.val} onClick={() => setTrendPeriod(p.val)}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${trendPeriod === p.val ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
              {loading ? <Skeleton h="h-56" /> : trend.length === 0
                ? <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No trend data for selected period.</div>
                : <div className="h-56"><Line data={lineData} options={lineOptions} /></div>}
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /> Ticket Status Breakdown</h3>
              {loading ? <Skeleton h="h-56" /> : statusTotal === 0
                ? <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No ticket data available.</div>
                : (
                  <div className="relative h-48">
                    <Doughnut data={donutData} options={donutOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-extrabold text-white font-display">{statusTotal}</span>
                      <span className="text-[10px] text-slate-400">Total</span>
                    </div>
                  </div>
                )}
              {!loading && statusTotal > 0 && (
                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800">
                  {[{ label: 'Open', val: tOverview.open, color: 'text-amber-400', status: 'open' }, { label: 'In Progress', val: tOverview.in_progress, color: 'text-blue-400', status: 'in_progress' }, { label: 'Resolved', val: tOverview.resolved, color: 'text-emerald-400', status: 'resolved' }, { label: 'Closed', val: tOverview.closed, color: 'text-slate-400', status: 'closed' }].map((s) => (
                    <button key={s.status} onClick={() => drillTo('status', s.status)}
                      className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <span className="text-[10px] text-slate-400">{s.label}</span>
                      <span className={`text-xs font-bold ${s.color}`}>{s.val || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Row 2: Category Bar + SLA ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" /> Service Category Distribution</h3>
              {loading ? <Skeleton h="h-56" /> : categoryData.length === 0
                ? <div className="h-56 flex items-center justify-center text-slate-500 text-xs">No category data available.</div>
                : <div className="h-56"><Bar data={catBarData} options={catBarOptions} /></div>}
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-cyan-400" /> SLA Performance</h3>
              {loading ? <Skeleton h="h-44" /> : slaTotal === 0
                ? <div className="h-44 flex items-center justify-center text-slate-500 text-xs">No SLA data for selected period.</div>
                : <div className="h-44"><Bar data={slaBarData} options={slaBarOptions} /></div>}
              {!loading && slaTotal > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  {[{ label: 'Within SLA', val: slaData.within_sla || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle }, { label: 'At Risk', val: slaData.at_risk || 0, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle }, { label: 'Breached', val: slaData.breached || 0, color: 'text-rose-400', bg: 'bg-rose-500/10', icon: XCircle }].map((s) => {
                    const Icon = s.icon;
                    return (
                      <button key={s.label} onClick={() => drillTo('slaStatus', s.label.toLowerCase().replace(' ', '_'))}
                        className={`flex flex-col items-center p-2 rounded-xl ${s.bg} hover:brightness-110 transition-all`}>
                        <Icon className={`w-4 h-4 ${s.color} mb-1`} />
                        <span className={`text-sm font-extrabold ${s.color}`}>{s.val}</span>
                        <span className="text-[9px] text-slate-400">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ── Row 3: Tech Productivity + Resolution by Priority ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /> Technician Productivity & Workload</h3>
              {loading ? <Skeleton h="h-64" /> : techPerformance.length === 0
                ? <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No technician data available.</div>
                : <div className="h-64"><Bar data={techBarData} options={techBarOptions} /></div>}
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" /> Avg Resolution Time by Priority</h3>
              {loading ? <Skeleton h="h-64" /> : sortedRT.length === 0
                ? <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No resolution time data available.</div>
                : <div className="h-64"><Bar data={rtBarData} options={rtBarOptions} /></div>}
            </Card>
          </div>

          {/* ── Top Insights ── */}
          {!loading && insights.length > 0 && (
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" /> Top Insights & Key Findings</h3>
              <div className="space-y-2">
                {insights.map((ins, i) => {
                  const Icon = ins.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${ins.bg} border border-slate-800`}>
                      <Icon className={`w-4 h-4 ${ins.color} shrink-0 mt-0.5`} />
                      <p className="text-xs text-slate-300 leading-relaxed">{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {!loading && insights.length === 0 && (
            <Card className="p-6 text-center text-slate-500 text-xs">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Insufficient data to generate meaningful insights for the selected period.
            </Card>
          )}
        </div>
      ) : (
        /* ── Report Generator Tab ── */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-4 md:col-span-1 p-4">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2"><Filter className="w-4 h-4 text-cyan-400" /> Report Configuration</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="glass-input w-full rounded-xl py-2 px-3 text-white">
                  <option value="ticket-summary" className="bg-slate-950">Ticket Executive Summary</option>
                  <option value="technician-performance" className="bg-slate-950">Technician Productivity Report</option>
                  <option value="service-trends" className="bg-slate-950">Service Category Trends</option>
                  <option value="sla-performance" className="bg-slate-950">SLA Performance Report</option>
                  <option value="resolution-times" className="bg-slate-950">Resolution Time Analysis</option>
                </select>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Start Date</label>
                <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="glass-input w-full rounded-xl py-2 px-3 text-white" />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">End Date</label>
                <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="glass-input w-full rounded-xl py-2 px-3 text-white" />
              </div>
            </div>
            <div className="pt-2 space-y-2">
              <Button variant="primary" className="w-full" onClick={handleDownloadPDF} icon={Download}>Download PDF</Button>
              <Button variant="success" className="w-full" onClick={handleDownloadExcel} icon={FileSpreadsheet}>Export Excel (.xlsx)</Button>
              <Button variant="ghost" className="w-full border border-slate-700" onClick={handleDownloadCSV} icon={FileText}>Export CSV</Button>
            </div>
          </Card>

          <div className="md:col-span-2 space-y-4">
            {[
              { icon: FileText, color: 'text-cyan-400', title: 'Ticket Executive Summary', desc: 'Complete ticket logs with status, priority, resolution time, SLA compliance, and category breakdown.' },
              { icon: Users, color: 'text-emerald-400', title: 'Technician Productivity Report', desc: 'Per-technician metrics including completed tickets, active workload, average resolution time, and satisfaction scores.' },
              { icon: BarChart3, color: 'text-violet-400', title: 'Service Category Trends', desc: 'Category-level ticket volumes, resolution rates, and demand patterns over the selected period.' },
              { icon: ShieldAlert, color: 'text-amber-400', title: 'SLA Performance Report', desc: 'Breakdown of tickets within SLA, at risk, and breached, with drill-down by category and priority.' },
              { icon: Clock, color: 'text-rose-400', title: 'Resolution Time Analysis', desc: 'Average resolution time per priority, category, and technician with trend comparison.' },
            ].map((r, i) => {
              const Icon = r.icon;
              return (
                <Card key={i} className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer" onClick={() => { setReportType(['ticket-summary', 'technician-performance', 'service-trends', 'sla-performance', 'resolution-times'][i]); }}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${r.color} shrink-0 mt-0.5`} />
                    <div>
                      <h4 className="text-sm font-bold text-white">{r.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{r.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto shrink-0 mt-0.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAndAnalytics;
