import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { useReportsData } from '../../hooks/useReports';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  BarChart3, TrendingUp, Users, FileText, Download, FileSpreadsheet,
  Filter, Clock, Star, AlertTriangle, CheckCircle, XCircle, ShieldAlert,
  RefreshCw, Lightbulb, ChevronRight, Calendar, Activity, Target, Zap,
  Search, Eye, FileCheck, Layers
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

  // ── Filter state ──
  const [period, setPeriod] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);

  // ── Report generator state ──
  const [reportType, setReportType] = useState('ticket-summary');
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');

  // ── Live Report Preview State ──
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const pageSize = 10;

  // Build current query params for analytics
  const queryParams = useMemo(() => {
    return startDate && endDate ? { startDate, endDate } : { period };
  }, [period, startDate, endDate]);

  // Use TanStack Query with persistent zero-loading cache
  const { data: reportsData = {}, isLoading: loading, isFetching: refreshing, refetch } = useReportsData(queryParams);

  const overview = reportsData.overview || {};
  const trend = reportsData.trend || [];
  const categoryData = reportsData.categoryData || [];
  const techPerformance = reportsData.techPerformance || [];
  const responseTimes = reportsData.responseTimes || [];
  const slaData = reportsData.slaData || {};

  const fetchAll = () => refetch();

  // Apply quick period pill for analytics
  const applyPeriod = (p) => {
    setPeriod(p);
    setStartDate('');
    setEndDate('');
    setUseCustomDate(false);
  };

  // Apply custom date range for analytics
  const applyCustomDate = () => {
    if (!startDate || !endDate) { toast.error('Please select both start and end dates'); return; }
    if (new Date(startDate) > new Date(endDate)) { toast.error('Start date must be before end date'); return; }
  };

  // Reset analytics filters
  const resetFilters = () => {
    setPeriod('30');
    setStartDate('');
    setEndDate('');
    setUseCustomDate(false);
  };

  // Fetch Live Report Generator Preview
  const fetchReportPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await api.get('/reports/preview', {
        params: { reportType, startDate: reportStart, endDate: reportEnd }
      });
      if (res && res.success) {
        setPreviewData(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching report preview:', err);
      toast.error('Failed to load report preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [reportType, reportStart, reportEnd]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportPreview();
    }
  }, [activeTab, fetchReportPreview]);

  // Handle Download (PDF, Excel, CSV) via Axios Blob with Token Auth
  const handleDownloadReport = async (format) => {
    const toastId = toast.loading(`Generating ${format.toUpperCase()} report...`);
    try {
      const response = await api.get(`/reports/download/${format}`, {
        params: { reportType, startDate: reportStart, endDate: reportEnd },
        responseType: 'blob',
      });
      
      const blobTypes = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv'
      };
      
      const blob = new Blob([response], { type: blobTypes[format] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : format;
      link.setAttribute('download', `report-${reportType}-${Date.now()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded successfully!`, { id: toastId });
    } catch (err) {
      console.error(`Error downloading ${format} report:`, err);
      toast.error(`Failed to generate ${format.toUpperCase()} report`, { id: toastId });
    }
  };

  const tOverview = overview.tickets || {};
  const techOverview = overview.technicians || {};
  const satOverview = overview.satisfaction || {};

  // SLA compliance rate
  const slaTotal = parseInt(slaData.within_sla || 0) + parseInt(slaData.at_risk || 0) + parseInt(slaData.breached || 0);
  const slaRate = slaTotal > 0 ? Math.round((parseInt(slaData.within_sla || 0) / slaTotal) * 100) : null;

  // Insights
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

  // Chart: Line
  const lineData = {
    labels: trend.map((t) => new Date(t.date).toLocaleDateString([], { weekday: 'short' })),
    datasets: [
      { label: 'New Tickets', data: trend.map((t) => parseInt(t.created || 0)), borderColor: '#2563eb', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, borderWidth: 2 },
      { label: 'Resolved Tickets', data: trend.map((t) => parseInt(t.resolved || 0)), borderColor: '#16a34a', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, borderWidth: 2 }
    ]
  };
  const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: LEGEND_STYLE.labels }, tooltip: CHART_TOOLTIP }, scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#94a3b8' } } } };

  // Chart: Donut
  const statusTotal = parseInt(tOverview.open || 0) + parseInt(tOverview.in_progress || 0) + parseInt(tOverview.resolved || 0) + parseInt(tOverview.closed || 0);
  const donutData = {
    labels: ['Pending', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{ data: [tOverview.open || 0, tOverview.in_progress || 0, tOverview.resolved || 0, tOverview.closed || 0], backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#64748b'], borderWidth: 2, borderColor: '#070b1e' }]
  };
  const donutOptions = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP } };

  // Chart: Category Bar
  const CAT_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'];
  const catBarData = {
    labels: categoryData.map((c) => c.name),
    datasets: [
      { label: 'Total Tickets', data: categoryData.map((c) => parseInt(c.total || 0)), backgroundColor: categoryData.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]), borderRadius: 6 },
      { label: 'Resolved', data: categoryData.map((c) => parseInt(c.resolved || 0)), backgroundColor: categoryData.map((_, i) => CAT_COLORS[i % CAT_COLORS.length] + '60'), borderRadius: 6 }
    ]
  };
  const catBarOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP }, scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true } } };

  // Chart: SLA Bar
  const slaBarData = {
    labels: ['Within SLA', 'At Risk', 'SLA Breached'],
    datasets: [{ label: 'Tickets', data: [slaData.within_sla || 0, slaData.at_risk || 0, slaData.breached || 0], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderRadius: 6 }]
  };
  const slaBarOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP }, scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, beginAtZero: true } } };

  // Chart: Tech Bar
  const techBarData = {
    labels: techPerformance.map((tp) => tp.full_name?.split(' ')[0] || 'N/A'),
    datasets: [
      { label: 'Completed', data: techPerformance.map((tp) => parseInt(tp.completed || 0)), backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Active', data: techPerformance.map((tp) => parseInt(tp.active || 0)), backgroundColor: '#3b82f6', borderRadius: 4 }
    ]
  };
  const techBarOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { ...LEGEND_STYLE, position: 'bottom' }, tooltip: CHART_TOOLTIP }, scales: { x: { ...AXIS_STYLE, beginAtZero: true }, y: AXIS_STYLE } };

  // Chart: RT Bar
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  const sortedRT = [...responseTimes].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
  const rtBarData = {
    labels: sortedRT.map((r) => r.priority?.toUpperCase() || ''),
    datasets: [{ label: 'Avg Resolution (hrs)', data: sortedRT.map((r) => parseFloat(r.avg_resolution_hours || 0)), backgroundColor: sortedRT.map((r) => PRIORITY_COLORS[r.priority] || '#64748b'), borderRadius: 4 }]
  };
  const rtBarOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP }, scales: { x: { ...AXIS_STYLE, beginAtZero: true }, y: AXIS_STYLE } };

  const drillTo = (filterKey, filterVal) => navigate(`/admin/tickets?${filterKey}=${filterVal}`);

  // KPI Cards
  const kpiCards = [
    { label: 'Total Tickets', value: tOverview.total || 0, sub: `Open: ${tOverview.open || 0}  In Progress: ${tOverview.in_progress || 0}`, icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', onClick: () => drillTo('status', 'all') },
    { label: 'Avg Resolution', value: tOverview.avg_resolution_hours ? `${parseFloat(tOverview.avg_resolution_hours).toFixed(1)}h` : '—', sub: `Target: < 24h`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'SLA Compliance', value: slaRate !== null ? `${slaRate}%` : '—', sub: `${slaData.breached || 0} breached  ${slaData.at_risk || 0} at risk`, icon: Target, color: slaRate !== null && slaRate < 80 ? 'text-rose-400' : 'text-emerald-400', bg: slaRate !== null && slaRate < 80 ? 'bg-rose-500/10' : 'bg-emerald-500/10', border: slaRate !== null && slaRate < 80 ? 'border-rose-500/20' : 'border-emerald-500/20', onClick: () => drillTo('slaStatus', 'breached') },
    { label: 'CSAT Rating', value: satOverview.avg_rating ? `${satOverview.avg_rating}/5` : '—', sub: `From ${satOverview.total_feedback || 0} reviews`, icon: Star, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: 'Active Techs', value: techOverview.active || 0, sub: `${techOverview.pending || 0} pending approval`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', onClick: () => navigate('/admin/technicians') },
  ];

  // Report Type Info mapping
  const REPORT_INFO = {
    'ticket-summary': { title: 'Ticket Executive Summary', desc: 'Detailed log of support tickets including status, priority, category, customer contact, and assignment.', icon: FileText, color: 'text-cyan-400' },
    'technician-performance': { title: 'Technician Productivity Report', desc: 'Individual technician performance, completed vs active workload, resolution speed, and satisfaction ratings.', icon: Users, color: 'text-emerald-400' },
    'service-trends': { title: 'Service Category Trends', desc: 'Breakdown of service requests by category, total volume, resolution success, and SLA breaches.', icon: BarChart3, color: 'text-violet-400' },
    'sla-performance': { title: 'SLA Performance Report', desc: 'Evaluation of ticket SLA deadlines, within-SLA status, at-risk warnings, and breaches.', icon: ShieldAlert, color: 'text-amber-400' },
    'resolution-times': { title: 'Resolution Time Analysis', desc: 'Granular analysis of turnaround times per ticket, priority classification, and assigned technician.', icon: Clock, color: 'text-rose-400' },
  };

  // Filter preview data by search term
  const filteredPreview = useMemo(() => {
    if (!previewSearch.trim()) return previewData;
    const term = previewSearch.toLowerCase().trim();
    return previewData.filter((item) => {
      const s1 = String(item.ticket_number || item.full_name || item.category_name || '').toLowerCase();
      const s2 = String(item.subject || item.customer_name || item.employee_id || '').toLowerCase();
      const s3 = String(item.status || item.priority || '').toLowerCase();
      return s1.includes(term) || s2.includes(term) || s3.includes(term);
    });
  }, [previewData, previewSearch]);

  const totalPreviewPages = Math.ceil(filteredPreview.length / pageSize) || 1;
  const paginatedPreview = useMemo(() => {
    const start = (previewPage - 1) * pageSize;
    return filteredPreview.slice(start, start + pageSize);
  }, [filteredPreview, previewPage]);

  const currentReportMeta = REPORT_INFO[reportType] || REPORT_INFO['ticket-summary'];
  const MetaIcon = currentReportMeta.icon;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Reports & Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Interactive operational metrics, performance trends, and custom report exports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchAll} className={`text-slate-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`}>Refresh</Button>
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
                  <button key={d.val} onClick={() => applyPeriod(d.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${period === d.val && !useCustomDate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white border border-slate-800'}`}>
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
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="glass-input rounded-lg py-1 px-2 text-xs border-slate-700 bg-slate-900 text-white" />
                  <span className="text-slate-500 text-xs">to</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="glass-input rounded-lg py-1 px-2 text-xs border-slate-700 bg-slate-900 text-white" />
                  <Button variant="primary" size="sm" onClick={applyCustomDate} className="text-xs">Apply</Button>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-slate-400 hover:text-rose-400">Reset</Button>
                {!useCustomDate && (
                  <span className="text-[10px] text-slate-500 italic">Click a period to apply instantly</span>
                )}
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
                    <button key={p.val} onClick={() => applyPeriod(p.val)}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${period === p.val && !useCustomDate ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>{p.label}</button>
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
                  {[{ label: 'Pending', val: tOverview.open, color: 'text-amber-400', status: 'open' }, { label: 'In Progress', val: tOverview.in_progress, color: 'text-blue-400', status: 'in_progress' }, { label: 'Resolved', val: tOverview.resolved, color: 'text-emerald-400', status: 'resolved' }, { label: 'Closed', val: tOverview.closed, color: 'text-slate-400', status: 'closed' }].map((s) => (
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
        </div>
      ) : (
        /* ── Report Generator Tab ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Report Configuration Card */}
          <Card className="space-y-5 lg:col-span-1 p-5 bg-slate-950/80 border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Filter className="w-4 h-4 text-cyan-400" /> Report Configuration
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                LIVE ENGINE
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Report Type Select */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Select Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value);
                    setPreviewPage(1);
                  }}
                  className="glass-input w-full rounded-xl py-2 px-3 text-white bg-slate-900 border-slate-700"
                >
                  <option value="ticket-summary">Ticket Executive Summary</option>
                  <option value="technician-performance">Technician Productivity Report</option>
                  <option value="service-trends">Service Category Trends</option>
                  <option value="sla-performance">SLA Performance Report</option>
                  <option value="resolution-times">Resolution Time Analysis</option>
                </select>
              </div>

              {/* Date Filters */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportStart}
                  onChange={(e) => { setReportStart(e.target.value); setPreviewPage(1); }}
                  className="glass-input w-full rounded-xl py-2 px-3 text-white bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">End Date</label>
                <input
                  type="date"
                  value={reportEnd}
                  onChange={(e) => { setReportEnd(e.target.value); setPreviewPage(1); }}
                  className="glass-input w-full rounded-xl py-2 px-3 text-white bg-slate-900 border-slate-700"
                />
              </div>

              {/* Date Quick Preset Buttons */}
              <div>
                <label className="text-slate-400 text-[11px] font-medium block mb-1.5">Quick Date Presets</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => { setReportStart(''); setReportEnd(''); setPreviewPage(1); }}
                    className={`py-1 rounded-lg text-[11px] font-semibold border transition-all ${!reportStart && !reportEnd ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setReportStart(today);
                      setReportEnd(today);
                      setPreviewPage(1);
                    }}
                    className="py-1 rounded-lg text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 30);
                      setReportStart(d.toISOString().split('T')[0]);
                      setReportEnd(new Date().toISOString().split('T')[0]);
                      setPreviewPage(1);
                    }}
                    className="py-1 rounded-lg text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                  >
                    Last 30D
                  </button>
                </div>
              </div>
            </div>

            {/* Download Export Buttons */}
            <div className="pt-2 space-y-2 border-t border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Export Data</p>
              <Button
                variant="primary"
                className="w-full justify-center text-xs font-bold py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400"
                onClick={() => handleDownloadReport('pdf')}
                icon={Download}
              >
                Download PDF Report
              </Button>
              <Button
                variant="success"
                className="w-full justify-center text-xs font-bold py-2"
                onClick={() => handleDownloadReport('excel')}
                icon={FileSpreadsheet}
              >
                Export Excel (.xlsx)
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-center text-xs font-bold py-2 border border-slate-700 text-slate-300 hover:text-white"
                onClick={() => handleDownloadReport('csv')}
                icon={FileText}
              >
                Export CSV Data
              </Button>
            </div>
          </Card>

          {/* Right: Live Interactive Report Preview & Data Table */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Report Type Selector Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: 'ticket-summary', label: 'Summary', icon: FileText, color: 'text-cyan-400' },
                { type: 'technician-performance', label: 'Technicians', icon: Users, color: 'text-emerald-400' },
                { type: 'service-trends', label: 'Categories', icon: BarChart3, color: 'text-violet-400' },
                { type: 'sla-performance', label: 'SLA Report', icon: ShieldAlert, color: 'text-amber-400' },
                { type: 'resolution-times', label: 'Resolution', icon: Clock, color: 'text-rose-400' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = reportType === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      setReportType(item.type);
                      setPreviewPage(1);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color} mb-1`} />
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Interactive Table Preview Container */}
            <Card className="p-0 overflow-hidden border-slate-800 bg-slate-950/80">
              {/* Table Header Controls */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                    <MetaIcon className={`w-4 h-4 ${currentReportMeta.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      {currentReportMeta.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                      {currentReportMeta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search preview..."
                      value={previewSearch}
                      onChange={(e) => {
                        setPreviewSearch(e.target.value);
                        setPreviewPage(1);
                      }}
                      className="glass-input w-full pl-8 pr-3 py-1 text-xs rounded-xl border-slate-700 bg-slate-900 text-white placeholder-slate-500"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={fetchReportPreview}
                    className={`text-slate-400 hover:text-white ${previewLoading ? 'animate-spin' : ''}`}
                  >
                    Sync
                  </Button>
                </div>
              </div>

              {/* Data Summary Bar */}
              <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Showing <strong className="text-white">{filteredPreview.length}</strong> matching records
                  {reportStart && reportEnd && (
                    <span className="ml-1 text-cyan-400">({reportStart} to {reportEnd})</span>
                  )}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Live Preview</span>
              </div>

              {/* Live Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    {reportType === 'technician-performance' ? (
                      <tr>
                        <th className="p-3">Technician</th>
                        <th className="p-3">Employee ID</th>
                        <th className="p-3">Specialization</th>
                        <th className="p-3">Assigned</th>
                        <th className="p-3">Completed</th>
                        <th className="p-3">Active</th>
                        <th className="p-3">Avg Resolution</th>
                        <th className="p-3">CSAT Rating</th>
                      </tr>
                    ) : reportType === 'service-trends' ? (
                      <tr>
                        <th className="p-3">Service Category</th>
                        <th className="p-3">Total Tickets</th>
                        <th className="p-3">Resolved Tickets</th>
                        <th className="p-3">SLA Breached</th>
                        <th className="p-3">Avg Resolution Time</th>
                      </tr>
                    ) : reportType === 'sla-performance' ? (
                      <tr>
                        <th className="p-3">Ticket ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">SLA Status</th>
                        <th className="p-3">SLA Deadline</th>
                        <th className="p-3">Assignee</th>
                      </tr>
                    ) : reportType === 'resolution-times' ? (
                      <tr>
                        <th className="p-3">Ticket ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Created Date</th>
                        <th className="p-3">Resolved Date</th>
                        <th className="p-3">Turnaround Time</th>
                      </tr>
                    ) : (
                      /* Default: ticket-summary */
                      <tr>
                        <th className="p-3">Ticket ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Assignee</th>
                        <th className="p-3">Created Date</th>
                      </tr>
                    )}
                  </thead>

                  <tbody className="divide-y divide-slate-800/60">
                    {previewLoading ? (
                      <tr>
                        <td colSpan="8" className="p-12 text-center text-slate-400">
                          <div className="flex items-center justify-center space-x-2 text-xs">
                            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                            <span>Generating live report dataset...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedPreview.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500">
                          <p className="text-sm font-semibold text-slate-400">No report records found.</p>
                          <p className="text-xs text-slate-500 mt-1">Try expanding the date range or selecting a different report type.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedPreview.map((row, idx) => {
                        if (reportType === 'technician-performance') {
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-900/70 transition-colors">
                              <td className="p-3 font-bold text-white">{row.full_name || 'N/A'}</td>
                              <td className="p-3 font-mono text-cyan-400">{row.employee_id || '-'}</td>
                              <td className="p-3 text-slate-300">{row.specialization || 'General Technician'}</td>
                              <td className="p-3 font-bold text-slate-200">{row.total_assigned || 0}</td>
                              <td className="p-3 font-bold text-emerald-400">{row.completed || 0}</td>
                              <td className="p-3 font-bold text-blue-400">{row.active || 0}</td>
                              <td className="p-3 text-slate-300">{row.avg_resolution_hours ? `${parseFloat(row.avg_resolution_hours).toFixed(1)}h` : '-'}</td>
                              <td className="p-3 font-bold text-violet-400">{row.avg_satisfaction ? `${row.avg_satisfaction} / 5` : '-'}</td>
                            </tr>
                          );
                        } else if (reportType === 'service-trends') {
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-900/70 transition-colors">
                              <td className="p-3 font-bold text-white">{row.category_name || 'Uncategorized'}</td>
                              <td className="p-3 font-bold text-cyan-400">{row.total_tickets || 0}</td>
                              <td className="p-3 font-bold text-emerald-400">{row.resolved_tickets || 0}</td>
                              <td className="p-3 font-bold text-rose-400">{row.sla_breached || 0}</td>
                              <td className="p-3 text-slate-300">{row.avg_hours ? `${parseFloat(row.avg_hours).toFixed(1)}h` : '-'}</td>
                            </tr>
                          );
                        } else if (reportType === 'sla-performance') {
                          const isBreached = row.sla_status === 'breached';
                          const isAtRisk = row.sla_status === 'at_risk';
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-900/70 transition-colors">
                              <td className="p-3 font-mono font-bold text-cyan-400">{row.ticket_number}</td>
                              <td className="p-3 font-medium text-white">{row.customer_name || '-'}</td>
                              <td className="p-3">
                                <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'}>
                                  {row.priority}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-300 capitalize">{row.status}</td>
                              <td className="p-3">
                                <Badge variant={isBreached ? 'danger' : isAtRisk ? 'warning' : 'success'}>
                                  {isBreached ? 'BREACHED' : isAtRisk ? 'AT RISK' : 'WITHIN SLA'}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">
                                {row.sla_deadline ? new Date(row.sla_deadline).toLocaleString() : '-'}
                              </td>
                              <td className="p-3 text-slate-300">{row.assignee_name || 'Unassigned'}</td>
                            </tr>
                          );
                        } else if (reportType === 'resolution-times') {
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-900/70 transition-colors">
                              <td className="p-3 font-mono font-bold text-cyan-400">{row.ticket_number}</td>
                              <td className="p-3 font-medium text-white">{row.customer_name || '-'}</td>
                              <td className="p-3 text-slate-300">{row.category_name || '-'}</td>
                              <td className="p-3">
                                <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'}>
                                  {row.priority}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">{new Date(row.created_at).toLocaleDateString()}</td>
                              <td className="p-3 text-slate-400 text-[11px]">{row.resolved_at ? new Date(row.resolved_at).toLocaleDateString() : 'Pending'}</td>
                              <td className="p-3 font-bold text-amber-400">{row.resolution_hours ? `${parseFloat(row.resolution_hours).toFixed(1)}h` : '-'}</td>
                            </tr>
                          );
                        } else {
                          /* Default: ticket-summary */
                          return (
                            <tr key={row.id || idx} className="hover:bg-slate-900/70 transition-colors">
                              <td className="p-3 font-mono font-bold text-cyan-400">{row.ticket_number}</td>
                              <td className="p-3">
                                <p className="font-bold text-white">{row.customer_name || 'Customer'}</p>
                                <p className="text-[10px] text-slate-400">{row.customer_contact || row.subject}</p>
                              </td>
                              <td className="p-3 text-slate-300">{row.category_name || 'General'}</td>
                              <td className="p-3">
                                <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'}>
                                  {row.priority}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <Badge variant={row.status === 'resolved' || row.status === 'closed' ? 'success' : row.status === 'in_progress' ? 'info' : 'warning'}>
                                  {row.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-300">{row.assignee_name || 'Unassigned'}</td>
                              <td className="p-3 text-slate-400 text-[11px]">{new Date(row.created_at).toLocaleDateString()}</td>
                            </tr>
                          );
                        }
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Pagination */}
              {totalPreviewPages > 1 && (
                <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex justify-end">
                  <Pagination
                    currentPage={previewPage}
                    totalPages={totalPreviewPages}
                    onPageChange={(p) => setPreviewPage(p)}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAndAnalytics;
