import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { MapPin, FileText, Send, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const UpdateTicketModal = ({ isOpen, onClose, ticket, onSuccess, onOpenFileServiceReport }) => {
  const [status, setStatus] = useState('in_progress');
  const [note, setNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status || 'in_progress');
      setResolutionSummary(ticket.resolution_summary || '');
      setNote('');
    }
  }, [ticket]);

  if (!ticket) return null;

  const isClosed = ticket.status === 'closed';

  const getAvailableStatusOptions = (currentStatus) => {
    if (currentStatus === 'closed') {
      return [{ value: 'closed', label: 'Closed' }];
    }
    if (currentStatus === 'resolved') {
      return [{ value: 'resolved', label: 'Resolved' }];
    }
    if (currentStatus === 'in_progress') {
      return [
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolve' }
      ];
    }
    return [
      { value: 'open', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'resolved', label: 'Resolve' }
    ];
  };

  const statusOptions = getAvailableStatusOptions(ticket.status);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.put(`/tickets/${ticket.id}`, {
        status,
        note,
        resolutionSummary,
      });
      if (res.success) {
        toast.success('Ticket updated successfully!');
        setNote('');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update: ${ticket.ticket_number}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Ticket Info Box */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <h3 className="text-sm font-bold text-white leading-snug flex-1 min-w-0 pr-2">{ticket.title}</h3>
            <Badge variant={ticket.priority === 'critical' ? 'danger' : 'cyan'} className="shrink-0">
              {ticket.priority}
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Customer: </span>
            {ticket.customer_name}
            {ticket.customer_contact ? ` (${ticket.customer_contact})` : ''}
          </p>
          <p className="text-xs text-slate-300 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>{ticket.customer_address || 'Address on file'}</span>
          </p>
          <p className="text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Category: </span>{ticket.category_name}
          </p>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
            <p className="text-xs text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-700/60 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
              {ticket.description || ticket.subject || ticket.title || 'No detailed description provided.'}
            </p>
          </div>
        </div>

        {/* Action Header & File Report trigger */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-1">
          <span className="text-xs font-bold text-white font-display">Service Progress & Update</span>
          <Button
            type="button"
            variant="success"
            size="sm"
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

        {isClosed ? (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 text-xs text-center space-y-1">
            <p className="font-bold text-slate-300 text-sm">🔒 Ticket Closed</p>
            <p>This ticket has been closed by the administrator. Status updates are locked.</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={statusOptions.length <= 1}
                className="glass-input w-full rounded-xl py-3 px-3 text-sm bg-slate-900 text-white disabled:opacity-60"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Work Note / Progress Log</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Arrived on site. Testing Starlink dish alignment..."
                className="glass-input w-full rounded-xl p-3 text-sm bg-slate-900 text-white"
              />
            </div>

            {status === 'resolved' && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Final Resolution Summary</label>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Explain what was done to fix the concern..."
                  className="glass-input w-full rounded-xl p-3 text-sm bg-slate-900 text-white"
                  required
                />
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full py-3 text-sm" isLoading={updating} icon={Send}>
              Save Status & Progress
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default UpdateTicketModal;
