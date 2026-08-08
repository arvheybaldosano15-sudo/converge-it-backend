import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, Star, Clock, Users, ShieldAlert } from 'lucide-react';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [trend, setTrend] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [techPerformance, setTechPerformance] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [overRes, trendRes, catRes, techRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/tickets-trend'),
          api.get('/analytics/category-breakdown'),
          api.get('/analytics/technician-performance'),
        ]);

        if (overRes.success) setOverview(overRes.data);
        if (trendRes.success) setTrend(trendRes.data);
        if (catRes.success) setCategoryData(catRes.data);
        if (techRes.success) setTechPerformance(techRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <Loader text="Computing analytical charts & statistics..." />;

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">System Graphical Analytics</h1>
        <p className="text-xs text-slate-400">Interactive operational metrics, technician performance, response trends, and customer satisfaction</p>
      </div>

      {/* Ticket Creation & Resolution Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Ticket Volume Trend (30 Days)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(str) => new Date(str).toLocaleDateString([], { month: 'numeric', day: 'numeric' })} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="created" stroke="#06b6d4" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Issue Category Pie Chart */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> Service Category Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Technician Productivity Bar Chart */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> Technician Completed Tasks & Productivity
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={techPerformance}>
              <XAxis dataKey="full_name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px' }} />
              <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} name="Completed Tickets" />
              <Bar dataKey="active" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Active Assigned" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
