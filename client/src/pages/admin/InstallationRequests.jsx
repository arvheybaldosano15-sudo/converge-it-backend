import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { ClipboardList, Eye, CheckCircle, Clock } from 'lucide-react';

const InstallationRequests = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstallationRequests();
  }, []);

  const fetchInstallationRequests = async () => {
    setLoading(true);
    try {
      // First find the category ID for "Installation Request"
      const catRes = await api.get('/categories');
      if (catRes.success) {
        const installCat = catRes.data.find(c => c.name.toLowerCase().includes('installation request'));
        if (installCat) {
          // Now fetch tickets with this category
          const ticketsRes = await api.get('/tickets', { params: { category: installCat.id, limit: 100 } });
          if (ticketsRes.success) {
            setTickets(ticketsRes.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching installation requests:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Loading Installation Requests..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Installation Requests</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              NEW MODULE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Manage and track customer installation service requests</p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4 font-bold">Ticket #</th>
                <th className="p-4 font-bold">Customer Details</th>
                <th className="p-4 font-bold">Installation Details</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Assigned Tech</th>
                <th className="p-4 font-bold">Date Created</th>
                <th className="p-4 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p>No installation requests found.</p>
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-cyan-400">{t.ticket_number}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-100">{t.customer_name || 'N/A'}</p>
                      <p className="text-slate-400 text-[10px]">{t.customer_contact || 'No Contact'}</p>
                      <p className="text-slate-500 text-[10px] truncate max-w-[200px]">{t.customer_address}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 line-clamp-2 max-w-[300px]">{t.description}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'}>
                        {t.status === 'open' ? 'Pending' : t.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-300">
                      {t.assignee_name || <span className="italic text-slate-500">Unassigned</span>}
                    </td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" icon={Eye} className="text-cyan-400 hover:text-cyan-300">
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default InstallationRequests;
