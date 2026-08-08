import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Notification Center</h1>
          <p className="text-xs text-slate-400">Real-time system alerts, ticket updates, and registration alerts</p>
        </div>
        <Button variant="secondary" size="sm" onClick={markAllRead} icon={CheckCheck}>
          Mark All Read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-40" />
            <p className="text-xs text-slate-400">No notifications found.</p>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`flex items-start justify-between p-4 ${
                !n.is_read ? 'border-l-4 border-l-cyan-400 bg-cyan-500/5' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">{n.title}</h4>
                  {!n.is_read && <Badge variant="cyan">New</Badge>}
                </div>
                <p className="text-xs text-slate-300">{n.body}</p>
                <span className="text-[10px] text-slate-500 block">{new Date(n.created_at).toLocaleString()}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
