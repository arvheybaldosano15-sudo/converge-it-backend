import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  UserCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles,
  Wifi,
  Camera,
  Cpu,
  Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard/admin');
        if (res.success) {
          setData(res.data);
        }
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

  const kpis = [
    { label: 'Open Tickets', value: stats.open_tickets || 0, icon: Ticket, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'In Progress', value: stats.in_progress_tickets || 0, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Resolved', value: stats.resolved_tickets || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'SLA Breached', value: stats.sla_breached || 0, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Administrator Dashboard</h1>
          <p className="text-xs text-slate-400">Overview of Converge IT Solutions support operations</p>
        </div>
        {pendingTechs > 0 && (
          <Button
            variant="warning"
            onClick={() => navigate('/admin/approvals')}
            className="animate-pulse"
            icon={UserCheck}
          >
            {pendingTechs} Technician{pendingTechs > 1 ? 's' : ''} Pending Approval
          </Button>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                <h3 className="text-2xl font-extrabold text-white font-display mt-0.5">{kpi.value}</h3>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Bar Chart */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">Tickets by Category</h3>
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Live Distribution
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#06b6d4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Quick Insights */}
        <Card glow className="space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <h3 className="text-base font-bold text-white font-display">AI Ticket Assistant</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automated Messenger integration has generated <span className="font-bold text-cyan-300">{stats.created_today || 0}</span> tickets today with instant classification & priority prediction.
            </p>
          </div>

          <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Avg Resolution Time:</span>
              <span className="font-semibold text-slate-200">14.2 hrs</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Auto-classified Accuracy:</span>
              <span className="font-semibold text-emerald-400">96.8%</span>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={() => navigate('/admin/ai')} className="w-full">
            View AI Recommendations
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Card>
      </div>

      {/* Recent Tickets & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets List */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">Recent Support Tickets</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tickets')}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent tickets.</p>
            ) : (
              recentTickets.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/admin/tickets`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-cyan-400">{t.ticket_number}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{t.title}</h4>
                      <p className="text-[11px] text-slate-400">{t.customer_name} • {t.category_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'}>
                      {t.priority}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Audit / Activity Stream */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white font-display">Live System Activity</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {recentActivity.map((act, i) => (
              <div key={i} className="text-xs border-l-2 border-cyan-500/50 pl-3 py-1 space-y-0.5">
                <p className="text-slate-200 font-medium">
                  <span className="font-bold text-cyan-300">{act.actor_name || 'System'}</span> {act.action}d {act.target_type}
                </p>
                <p className="text-[10px] text-slate-400">{act.target_description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
