import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Loader from '../common/Loader';
import { getUploadUrl } from '../../utils/urlHelper';
import {
  Clock,
  MapPin,
  User,
  Phone,
  Tag,
  FileText,
  CheckCircle,
  AlertTriangle,
  Send,
  Edit,
  Camera,
  History,
  ShieldAlert,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const getSlaInfo = (deadlineStr, status) => {
  if (status === 'resolved' || status === 'closed') {
    return { text: 'Resolved', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  }
  if (!deadlineStr) {
    return { text: 'No SLA Set', colorClass: 'text-slate-400 bg-slate-800/50 border-slate-700/50' };
  }

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { text: 'SLA Breached', colorClass: 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const text = hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;

  return {
    text,
    colorClass: hours < 4
      ? 'text-amber-400 bg-amber-500/15 border-amber-500/40'
      : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  };
};

const ViewTicketModal = ({ isOpen, onClose, ticketId, onOpenUpdateModal, onOpenFileServiceReport }) => {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId || !isOpen) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tickets/${ticketId}`);
        if (res.success) {
          setTicketData(res.data);
        }
      } catch (e) {
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [ticketId, isOpen]);

  if (!isOpen) return null;

  const ticket = ticketData;
  const updates = ticketData?.updates || [];
  const report = ticketData?.serviceReport || null;
  const slaInfo = ticket ? getSlaInfo(ticket.sla_deadline, ticket.status) : {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ticket ? `Ticket Details: ${ticket.ticket_number}` : 'Ticket Details'} maxWidth="max-w-2xl">
      {loading || !ticket ? (
        <div className="py-12 flex justify-center">
          <Loader text="Loading field ticket profile..." />
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* Header Bar: ID, Priority, SLA, Status */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <span className="font-mono text-sm font-extrabold text-cyan-400">{ticket.ticket_number}</span>
                <h3 className="text-base font-bold text-white mt-1 leading-snug">{ticket.subject || ticket.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant={ticket.priority === 'critical' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'cyan'}>
                  {ticket.priority} Priority
                </Badge>
                <Badge variant={ticket.status === 'resolved' ? 'success' : ticket.status === 'in_progress' ? 'primary' : 'warning'}>
                  {ticket.status === 'open' ? 'pending' : ticket.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-400" /> {ticket.category_name}
              </span>
              <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${slaInfo.colorClass}`}>
                ⏰ {slaInfo.text}
              </span>
            </div>
          </div>

          {/* Customer & Location Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
              Customer Profile & Field Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-slate-400 font-medium">Customer Name:</p>
                <p className="text-white font-bold text-sm">{ticket.customer_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Contact Phone:</p>
                <p className="text-white font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-cyan-400" /> {ticket.customer_contact || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-slate-400 font-medium">Service Location Address:</p>
              <p className="text-white font-semibold flex items-start gap-1.5 mt-0.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{ticket.customer_address || 'Address provided in issue description'}</span>
              </p>
            </div>
          </div>

          {/* Issue Description */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
              Issue & Technical Concern Description
            </h4>
            <p className="text-xs text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-700/60 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
              {ticket.description || ticket.subject || 'No detailed description available.'}
            </p>
          </div>

          {/* Status Updates & Timeline */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Ticket Status & Activity Timeline
            </h4>

            <div className="space-y-3 pt-1">
              {/* Event 1: Created */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-white">Ticket Created</p>
                  <p className="text-slate-400 text-[11px]">System recorded ticket entry</p>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Event Updates */}
              {updates.map((up, idx) => (
                <div key={up.id || idx} className="flex items-start space-x-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">
                      Status updated to <span className="text-cyan-300 capitalize">{up.status_changed_to?.replace('_', ' ')}</span>
                    </p>
                    {up.notes && <p className="text-slate-300 italic text-[11px] bg-slate-950/50 p-2 rounded border border-slate-800/80 mt-1">"{up.notes}"</p>}
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      by {up.user_name || 'Technician'} • {new Date(up.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}

              {/* Resolved/Closed state */}
              {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                <div className="flex items-start space-x-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-emerald-400">
                      Ticket {ticket.status === 'closed' ? 'Closed' : 'Resolved'}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : new Date(ticket.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filed Service Report Section if available */}
          {report && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-2">
              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Filed Field Service Report
              </h4>
              <p className="text-sm font-bold text-white">{report.title}</p>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Work Performed:</span>
                <p className="text-slate-200 bg-slate-950/70 p-2.5 rounded border border-slate-800 mt-0.5">{report.work_performed}</p>
              </div>
              {report.materials_used && (
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Materials Used:</span>
                  <p className="text-slate-300 mt-0.5">{report.materials_used}</p>
                </div>
              )}
              {report.customer_name_signed && (
                <p className="text-xs text-slate-300 pt-1">✍️ Signed by: <strong className="text-white">{report.customer_name_signed}</strong></p>
              )}
            </div>
          )}

          {/* Action buttons at bottom of view modal */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                onClose();
                if (onOpenUpdateModal) onOpenUpdateModal(ticket);
              }}
              icon={Edit}
            >
              Update Ticket Status
            </Button>

            <Button
              variant="success"
              className="w-full sm:w-auto"
              onClick={() => {
                onClose();
                if (onOpenFileServiceReport) onOpenFileServiceReport(ticket);
              }}
              icon={FileText}
            >
              File Service Report
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ViewTicketModal;
