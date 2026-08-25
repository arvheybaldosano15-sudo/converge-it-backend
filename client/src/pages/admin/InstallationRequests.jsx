import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { getUploadUrl, parseImageUrls } from '../../utils/urlHelper';
import { ClipboardList, Eye, Wrench, UserCheck, CheckCircle, Clock, MapPin, Phone, User, X, RefreshCw, MessageSquare, FileText, Camera, Maximize2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const InstallationRequests = () => {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);

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
                  <tr key={t.id} className="hover:bg-slate-900/70 transition-colors align-middle">
                    <td className="p-4 align-middle font-mono font-bold text-cyan-400">{t.ticket_number}</td>
                    <td className="p-4 align-middle">
                      <p className="font-bold text-slate-100 text-[13px] whitespace-normal break-words leading-tight">{t.customer_name || 'N/A'}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{t.customer_contact || 'No Contact'}</p>
                      <p className="text-slate-500 text-[10px] truncate max-w-[200px] mt-0.5">{t.customer_address}</p>
                    </td>
                    <td className="p-4 align-middle">
                      <p className="text-slate-300 line-clamp-2 max-w-[300px]">{t.description}</p>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : t.status === 'closed' ? 'default' : 'warning'}>
                        {t.status === 'open' ? 'Pending' : t.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
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
                    <td className="p-4 align-middle text-slate-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 align-middle text-right">
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

            {/* Assigned Technician Info & Close Request Action */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Technician</span>
                  {selectedTicket.assignee_name || selectedTicket.assigned_to ? (
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-bold text-sm text-indigo-200">{selectedTicket.assignee_name || 'Assigned Technician'}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 font-medium italic">Unassigned</span>
                  )}
                </div>

                <div className="self-end sm:self-center">
                  {selectedTicket.status !== 'closed' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 border border-rose-400/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Close Request
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60 italic">
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Request Closed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Field Service Report (if available) */}
            {selectedTicket.serviceReport && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Filed Field Technician Service Completion Report</span>
                  </div>
                  <Badge variant="success">Report Submitted</Badge>
                </div>

                {selectedTicket.serviceReport.title && (
                  <p className="text-sm font-bold text-white">{selectedTicket.serviceReport.title}</p>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Work Performed</span>
                  <p className="text-xs text-slate-200 bg-slate-950/70 p-3 rounded-lg border border-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.serviceReport.work_performed}
                  </p>
                </div>

                {selectedTicket.serviceReport.materials_used && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Materials Used</span>
                    <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800 mt-1">
                      {selectedTicket.serviceReport.materials_used}
                    </p>
                  </div>
                )}

                {selectedTicket.serviceReport.customer_name_signed && (
                  <p className="text-xs text-slate-300 pt-0.5">✍️ Signed by: <strong className="text-white">{selectedTicket.serviceReport.customer_name_signed}</strong></p>
                )}

                {/* Submitted Work Proof Photos & Signature */}
                {(() => {
                  const report = selectedTicket.serviceReport;
                  const photos = parseImageUrls(report.images_urls || report.imagesUrls || report.image_urls || report.images);
                  if (photos.length === 0 && !report.signature_url) return null;
                  return (
                    <div className="pt-2 space-y-3 border-t border-slate-800/80">
                      {photos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-cyan-400" /> Installation Photos ({photos.length})
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                            {photos.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setFullscreenImage(getUploadUrl(url))}
                                className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video block w-full text-left cursor-pointer transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
                              >
                                <img
                                  src={getUploadUrl(url)}
                                  alt={`Installation Photo ${i + 1}`}
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%230f172a'/%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='2'%3E%3Crect x='130' y='90' width='140' height='100' rx='10'/%3E%3Ccircle cx='200' cy='140' r='25'/%3E%3C/g%3E%3Ctext x='200' y='220' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'%3EPhoto Unavailable%3C/text%3E%3C/svg%3E";
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="text-white text-xs font-semibold bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" /> Full Size
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.signature_url && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-medium text-slate-400 block">Customer Signature:</span>
                          <div
                            onClick={() => setFullscreenImage(getUploadUrl(report.signature_url))}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 inline-block cursor-pointer hover:border-cyan-400 transition-colors"
                          >
                            <img
                              src={getUploadUrl(report.signature_url)}
                              alt="Customer signature"
                              className="h-16 object-contain max-w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

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

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          {/* Header controls */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={fullscreenImage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white transition-colors border border-slate-700 shadow-lg flex items-center gap-1.5 text-xs font-semibold px-3.5"
              title="Open Original Image"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" /> Open Original
            </a>
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="p-2.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white transition-colors shadow-lg active:scale-95"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Container */}
          <div className="max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage}
              alt="Enlarged View"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationRequests;
