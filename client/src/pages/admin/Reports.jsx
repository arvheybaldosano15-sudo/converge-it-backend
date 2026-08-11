import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  BarChart3, TrendingUp, Users, FileText, Download,
  FileSpreadsheet, Filter, Clock, Star, AlertTriangle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Register ChartJS plugins/modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ReportsAndAnalytics = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [trend, setTrend] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [techPerformance, setTechPerformance] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);

  // Report generation state
  const [reportType, setReportType] = useState('ticket-summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [overRes, trendRes, catRes, techRes, responseRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/tickets-trend'),
          api.get('/analytics/category-breakdown'),
          api.get('/analytics/technician-performance'),
          api.get('/analytics/response-times'),
        ]);

        if (overRes.success) setOverview(overRes.data || {});
        if (trendRes.success) setTrend(trendRes.data || []);
        if (catRes.success) setCategoryData(catRes.data || []);
        if (techRes.success) setTechPerformance(techRes.data || []);
        if (responseRes.success) setResponseTimes(responseRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleDownloadPDF = () => {
    const query = new URLSearchParams({ reportType, startDate, endDate }).toString();
    window.open(`/api/reports/download/pdf?${query}`, '_blank');
    toast.success('PDF report download initiated!');
  };

  const handleDownloadExcel = () => {
    const query = new URLSearchParams({ startDate, endDate }).toString();
    window.open(`/api/reports/download/excel?${query}`, '_blank');
    toast.success('Excel spreadsheet download initiated!');
  };

  if (loading) return <Loader text="Computing analytical charts & statistics..." />;

  // Chart configuration: Ticket Trend (Line)
  const lineData = {
    labels: trend.map((t) => new Date(t.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })),
    datasets: [
      {
        label: 'Created',
        data: trend.map((t) => t.created),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#06b6d4',
      },
      {
        label: 'Resolved',
        data: trend.map((t) => t.resolved),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10b981',
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'inherit', size: 11, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  };

  // Chart configuration: Service Categories (Doughnut)
  const doughnutData = {
    labels: categoryData.map((c) => c.name),
    datasets: [
      {
        data: categoryData.map((c) => c.total),
        backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'],
        borderWidth: 1,
        borderColor: '#070b1e',
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#94a3b8',
          font: { family: 'inherit', size: 11, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
      }
    }
  };

  // Chart configuration: Response Times by Priority (Horizontal Bar)
  const priorityLabels = responseTimes.map((r) => r.priority.toUpperCase());
  const responseBarData = {
    labels: priorityLabels,
    datasets: [
      {
        label: 'Avg Resolution Hours',
        data: responseTimes.map((r) => parseFloat(r.avg_resolution_hours || 0)),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      }
    ]
  };

  const responseBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'inherit', size: 11, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      }
    }
  };

  // Chart configuration: Technician Performance (Bar)
  const barData = {
    labels: techPerformance.map((tp) => tp.full_name),
    datasets: [
      {
        label: 'Completed Tickets',
        data: techPerformance.map((tp) => tp.completed),
        backgroundColor: '#10b981',
        borderRadius: 6,
        borderWidth: 0,
      },
      {
        label: 'Active Assigned',
        data: techPerformance.map((tp) => tp.active),
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        borderWidth: 0,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'inherit', size: 11, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      }
    }
  };

  const tOverview = overview.tickets || {};
  const cOverview = overview.customers || {};
  const techOverview = overview.technicians || {};
  const satOverview = overview.satisfaction || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Reports & Analytics</h1>
          <p className="text-xs text-slate-400">Interactive operational metrics, performance trends, and custom report exports</p>
        </div>
        
        {/* Modern Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Report Generator
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Tickets Volume */}
            <Card glow className="p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">Total Tickets</p>
                <h3 className="text-sm sm:text-lg font-bold text-white font-mono leading-none">{tOverview.total || 0}</h3>
                <p className="text-[8px] sm:text-[9px] text-slate-500 truncate">
                  Open: <span className="text-cyan-400 font-semibold">{tOverview.open || 0}</span> | Res: <span className="text-emerald-400 font-semibold">{tOverview.resolved || 0}</span>
                </p>
              </div>
            </Card>

            {/* Card 2: Avg Resolution & SLA */}
            <Card glow className="p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">Avg Resolution</p>
                <h3 className="text-sm sm:text-lg font-bold text-white font-mono leading-none">
                  {tOverview.avg_resolution_hours || '0.0'}<span className="text-[9px] sm:text-[10px] text-slate-400 font-normal ml-0.5">h</span>
                </h3>
                <p className="text-[8px] sm:text-[9px] text-rose-400 flex items-center gap-0.5 truncate">
                  <AlertTriangle className="w-2.5 h-2.5" /> {tOverview.sla_breached || 0} SLA
                </p>
              </div>
            </Card>

            {/* Card 3: Technicians Overview */}
            <Card glow className="p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">Technicians</p>
                <h3 className="text-sm sm:text-lg font-bold text-white font-mono leading-none">{techOverview.active || 0}</h3>
                <p className="text-[8px] sm:text-[9px] text-slate-500 truncate">
                  Pending: <span className="text-amber-400 font-semibold">{techOverview.pending || 0}</span>
                </p>
              </div>
            </Card>

            {/* Card 4: Customer Satisfaction */}
            <Card glow className="p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">CSAT Rating</p>
                <h3 className="text-sm sm:text-lg font-bold text-white font-mono leading-none">
                  {satOverview.avg_rating || '5.0'}<span className="text-[9px] sm:text-[10px] text-slate-400 font-normal ml-0.5">/5</span>
                </h3>
                <p className="text-[8px] sm:text-[9px] text-slate-500 truncate">
                  From {satOverview.total_feedback || 0} reviews
                </p>
              </div>
            </Card>
          </div>

          {/* Charts Row 1: Line & Doughnut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Creation & Resolution Trend */}
            <Card className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Ticket Volume Trend (30 Days)
                </h3>
              </div>
              <div className="h-64 relative">
                <Line data={lineData} options={lineOptions} />
              </div>
            </Card>

            {/* Issue Category Pie Chart */}
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Service Category Distribution
              </h3>
              <div className="h-64 relative flex items-center justify-center">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </Card>
          </div>

          {/* Charts Row 2: Tech Performance & Priority Times */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Technician Productivity */}
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Technician Completed Tasks & Productivity
              </h3>
              <div className="h-72 relative">
                <Bar data={barData} options={barOptions} />
              </div>
            </Card>

            {/* Response Time by Priority */}
            <Card className="space-y-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Average Resolution Time by Ticket Priority
              </h3>
              <div className="h-72 relative">
                <Bar data={responseBarData} options={responseBarOptions} />
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls Card */}
          <Card className="space-y-4 md:col-span-1">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" /> Report Configuration
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="glass-input w-full rounded-xl py-2 px-3 text-white"
                >
                  <option value="ticket-summary" className="bg-slate-950 text-white">Ticket Executive Summary</option>
                  <option value="technician-performance" className="bg-slate-950 text-white">Technician Productivity</option>
                  <option value="service-trends" className="bg-slate-950 text-white">Service Category Trends</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="glass-input w-full rounded-xl py-2 px-3 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="glass-input w-full rounded-xl py-2 px-3 text-white"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button variant="primary" className="w-full" onClick={handleDownloadPDF} icon={Download}>
                Download PDF Report
              </Button>
              <Button variant="success" className="w-full" onClick={handleDownloadExcel} icon={FileSpreadsheet}>
                Export Excel (.xlsx)
              </Button>
            </div>
          </Card>

          {/* Report Previews / Cards */}
          <div className="md:col-span-2 space-y-4">
            <Card glow className="space-y-3">
              <div className="flex items-center space-x-3 text-cyan-400">
                <FileText className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-white">Ticket Executive Summary</h4>
                  <p className="text-xs text-slate-300">Detailed logs of all support cases, priority distributions, and resolution times.</p>
                </div>
              </div>
            </Card>

            <Card glow className="space-y-3">
              <div className="flex items-center space-x-3 text-emerald-400">
                <FileSpreadsheet className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-white">Technician Performance & Field Audit</h4>
                  <p className="text-xs text-slate-300">Metrics on assigned tasks, field report uploads, customer ratings, and response times per technician.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAndAnalytics;
