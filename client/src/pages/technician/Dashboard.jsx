import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Ticket, Clock, CheckCircle, AlertTriangle, ArrowRight, Wrench, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../../context/SocketContext';
import { useTechDashboard } from '../../hooks/useDashboard';

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const { data = null, isLoading: loading } = useTechDashboard();

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

  if (loading) return <Loader text="Loading technician task queue..." />;

  const stats = data?.stats || {};
  const recentTickets = data?.recentTickets || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Field Technician Workspace</h1>
        <p className="text-xs text-slate-400">View assigned tasks, update ticket status, and upload service reports in real time</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Assigned</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{stats.open_tickets || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">In Progress</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{stats.in_progress_tickets || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Urgent / High</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{stats.urgent_tickets || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed Today</p>
            <h3 className="text-2xl font-extrabold text-white font-display">{data?.completedToday || 0}</h3>
          </div>
        </Card>
      </div>

      {/* Priority Assigned Tickets Queue */}
      <Card className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white font-display">Assigned Service Queue</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/technician/assigned')}>
            View All Assigned <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {recentTickets.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No active assigned tickets right now.</p>
          ) : (
            recentTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate('/technician/assigned')}
                className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-cyan-400">{t.ticket_number}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{t.title}</h4>
                  </div>
                  <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'}>
                    {t.priority}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {t.customer_address || 'Address on file'}</span>
                  <span className="text-cyan-300 font-semibold">{t.category_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;
