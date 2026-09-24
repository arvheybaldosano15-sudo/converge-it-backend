import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { Bell, CheckCheck, ExternalLink, Ticket, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const checkIsInstallation = (n) => {
  if (!n) return false;
  const typeLower = (n.type || '').toLowerCase();
  const catLower = (n.category_name || '').toLowerCase();
  const titleLower = (n.title || '').toLowerCase();
  const bodyLower = (n.body || n.message || '').toLowerCase();

  return (
    typeLower.includes('install') ||
    catLower.includes('install') ||
    titleLower.includes('installation') ||
    bodyLower.includes('installation') ||
    titleLower.includes('install request') ||
    bodyLower.includes('install request') ||
    titleLower.includes('new installation')
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (e) {
      toast.error('Failed to update notifications');
    }
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.put(`/notifications/${n.id}/read`);
      } catch (e) {}
    }

    const isInstallation = checkIsInstallation(n);
    if (isInstallation) {
      navigate('/admin/installation-requests');
    } else {
      navigate('/admin/tickets');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Notification Center</h1>
          <p className="text-xs text-slate-400">Real-time system alerts, ticket updates, and installation requests</p>
        </div>
        <Button variant="secondary" size="sm" onClick={markAllRead} icon={CheckCheck}>
          Mark All Read
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 text-center py-12">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-40" />
            <p className="text-xs text-slate-400">No notifications found.</p>
          </Card>
        ) : (
          notifications.map((n) => {
            const isInstallation = checkIsInstallation(n);
            const isTicketNotif = n.type === 'ticket' || n.type === 'installation' || n.title?.includes('#') || n.reference_id;

            return (
              <Card
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`flex items-start justify-between p-4 cursor-pointer hover:border-slate-700 transition-all ${
                  !n.is_read ? 'border-l-4 border-l-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {isInstallation ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Installation Request
                      </span>
                    ) : isTicketNotif ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                        <Ticket className="w-3 h-3" /> Tickets Management
                      </span>
                    ) : null}
                    <h4 className="text-sm font-bold text-white">{n.title}</h4>
                    {!n.is_read && <Badge variant="cyan">New</Badge>}
                  </div>
                  <p className="text-xs text-slate-300">{n.body || n.message}</p>
                  <span className="text-[10px] text-slate-500 block">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
