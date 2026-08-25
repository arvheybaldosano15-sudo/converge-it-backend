import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { ClipboardList, Eye, Wrench, UserCheck, CheckCircle, Clock, MapPin, Phone, User, X, RefreshCw, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const InstallationRequests = () => {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Workflow action states
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Load active technicians
      const techRes = await api.get('/technicians?status=active&limit=100').catch(() => null);
      if (techRes && techRes.success) {
        setTechnicians(techRes.data || []);
      }

      // Fetch category ID for Installation Request
      const catRes = await api.get('/categories');
      if (catRes.success) {
        const installCat = catRes.data.find(c => c.name.toLowerCase().includes('installation request'));
        if (installCat) {
          const ticketsRes = await api.get('/tickets', { params: { category: installCat.id, limit: 100 } });
          if (ticketsRes.success) {
            setTickets(ticketsRes.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching installation requests:', err);
      toast.error('Failed to load installation requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallationRequestsOnly = async () => {
    try {
      const catRes = await api.get('/categories');
      if (catRes.success) {
        const installCat = catRes.data.find(c => c.name.toLowerCase().includes('installation request'));
        if (installCat) {
          const ticketsRes = await api.get('/tickets', { params: { category: installCat.id, limit: 100 } });
          if (ticketsRes.success) {
            setTickets(ticketsRes.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing installation requests:', err);
    }
  };

  const refreshTicketDetail = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      if (res.success) {
        setSelectedTicket(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTechnician = async (ticketId, technicianId) => {
    try {
      const res = await api.put(`/tickets/${ticketId}`, { assignedTo: technicianId || null });
      if (res.success) {
        toast.success('Technician assigned successfully');
        fetchInstallationRequestsOnly();
        if (selectedTicket && selectedTicket.id === ticketId) {
          refreshTicketDetail(ticketId);
        }
      }
    } catch (err) {
      toast.error('Failed to assign technician');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await api.put(`/tickets/${ticketId}`, { status: newStatus });
      if (res.success) {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        fetchInstallationRequestsOnly();
        if (selectedTicket && selectedTicket.id === ticketId) {
          refreshTicketDetail(ticketId);
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedTicket) return;
    setIsSubmittingNote(true);
    try {
      const res = await api.put(`/tickets/${selectedTicket.id}`, { note: noteText });
      if (res.success) {
        toast.success('Note added successfully');
        setNoteText('');
        refreshTicketDetail(selectedTicket.id);
        fetchInstallationRequestsOnly();
      }
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const viewTicketDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
    refreshTicketDetail(ticket.id);
  };

  if (loading) return <Loader text="Loading Installation Requests..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Installation Requests</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Manage and assign new customer installation requests</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchInitialData} icon={RefreshCw} className="text-slate-400 hover:text-white">
          Refresh
        </Button>
      </div>

      {/* Main Table */}
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
                tickets.map((t) => (
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
                      <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : t.status === 'closed' ? 'default' : 'warning'}>
                        {t.status === 'open' ? 'Pending' : t.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {t.assigned_to ? (
                        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 max-w-[160px]">
                          <UserCheck className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                          <span className="truncate font-semibold text-[11px]">{t.assignee_name || 'Assigned'}</span>
                        </div>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => handleAssignTechnician(t.id, e.target.value)}
                          className="glass-input text-[11px] rounded-lg py-1 px-2 border-slate-700 bg-slate-900 text-purple-300 font-semibold max-w-[140px]"
                        >
                          <option value="">-- Assign Tech --</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => viewTicketDetail(t)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title=""
        maxWidth="max-w-3xl"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-lg font-extrabold text-cyan-400">{selectedTicket.ticket_number}</span>
                <Badge variant={selectedTicket.status === 'resolved' ? 'success' : selectedTicket.status === 'in_progress' ? 'info' : selectedTicket.status === 'closed' ? 'default' : 'warning'}>
                  {selectedTicket.status === 'open' ? 'Pending' : selectedTicket.status.replace('_', ' ')}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-white font-display">
                {selectedTicket.subject || 'Installation Request'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Submitted on {new Date(selectedTicket.created_at).toLocaleString()}</p>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Customer Information</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    Name: <strong className="text-white">{selectedTicket.customer_name || 'N/A'}</strong>
                  </p>
                  <p className="text-slate-400 flex items-center gap-2 mt-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    Contact: <strong className="text-white">{selectedTicket.customer_contact || 'Not provided'}</strong>
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    Address: <strong className="text-white">{selectedTicket.customer_address || 'Not provided'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Installation Details */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Request & Form Details</span>
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
            </div>

            {/* Management & Assignment Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Assign Technician
                </label>
                {(selectedTicket.assigned_technician_id || selectedTicket.assigned_to) ? (
                  <div className="flex items-center space-x-2 px-3 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 w-full">
                    <UserCheck className="w-4 h-4 shrink-0 text-indigo-400" />
                    <div>
                      <p className="font-bold text-sm text-indigo-200">{selectedTicket.assignee_name || 'Assigned Technician'}</p>
                      <p className="text-[10px] text-indigo-400/70 mt-0.5">Technician already assigned — cannot be changed</p>
                    </div>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => handleAssignTechnician(selectedTicket.id, e.target.value)}
                    className="glass-input w-full rounded-xl py-2 px-3 border-slate-700 bg-slate-900 text-purple-300 font-semibold"
                  >
                    <option value="">-- Unassigned --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Update Request Status
                </label>
                <select
                  value={selectedTicket.status || 'open'}
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                  className="glass-input w-full rounded-xl py-2 px-3 border-slate-700 bg-slate-900 text-slate-200 font-semibold"
                >
                  <option value="open">Pending / Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Ticket Updates / History */}
            {selectedTicket.updates && selectedTicket.updates.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Activity History & Notes</span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedTicket.updates.map((u) => (
                    <div key={u.id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-cyan-400">{u.user_name || 'System'}</span>
                        <span>{new Date(u.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300">{u.note || u.update_description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Internal Note */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Add Internal Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type an internal note or update..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="glass-input flex-1 text-xs rounded-xl py-2 px-3 border-slate-700 bg-slate-900 text-white placeholder-slate-500"
                />
                <Button type="submit" size="sm" variant="primary" disabled={isSubmittingNote || !noteText.trim()}>
                  {isSubmittingNote ? 'Saving...' : 'Add Note'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InstallationRequests;
