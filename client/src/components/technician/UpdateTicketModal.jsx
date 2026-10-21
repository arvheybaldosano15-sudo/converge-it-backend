import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Loader from '../common/Loader';
import { useSocket } from '../../context/SocketContext';
import { parseImageUrls } from '../../utils/urlHelper';
import { MapPin, Send, AlertTriangle, Camera, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const UpdateTicketModal = ({ isOpen, onClose, ticket, onSuccess, onOpenFileServiceReport }) => {
  const { socket } = useSocket();
  const [fullTicket, setFullTicket] = useState(() => ticket || null);
  const [status, setStatus] = useState(() => ticket?.status || 'in_progress');
  const [userSelectedStatus, setUserSelectedStatus] = useState(false);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Sync ticket prop immediately whenever modal opens or ticket changes (0ms instant render)
  useEffect(() => {
    if (isOpen && ticket) {
      setFullTicket(ticket);
      setStatus(ticket.status || 'in_progress');
      setUserSelectedStatus(false);
      setNote('');
      setLoadingDetails(false);
    } else if (!isOpen) {
      setFullTicket(null);
      setUserSelectedStatus(false);
      setNote('');
      setLoadingDetails(false);
    }
  }, [isOpen, ticket]);

  const activeTicket = fullTicket || ticket;
  const effectiveId = ticket?.id || fullTicket?.id;

  // Real-time background fetch to get latest status and attached service report
  const fetchFullTicket = useCallback(async (isSilent = true) => {
    if (!effectiveId) return;
    if (!isSilent && !activeTicket) {
      setLoadingDetails(true);
    }
    try {
      const res = await api.get(`/tickets/${effectiveId}`, {
        params: { fresh: true, _t: Date.now() },
      });
      if (res && res.success && res.data) {
        setFullTicket((prev) => ({ ...(prev || {}), ...res.data }));
        if (!userSelectedStatus) {
          setStatus(res.data.status || 'in_progress');
        }
      }
    } catch (err) {
      console.warn('Background ticket fetch error:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [effectiveId, activeTicket, userSelectedStatus]);

  // Fetch full details silently in background as soon as modal opens
  useEffect(() => {
    if (isOpen && effectiveId) {
      fetchFullTicket(true);
    }
  }, [isOpen, effectiveId, fetchFullTicket]);

  // Real-time WebSocket listeners: update details live without user needing to refresh
  useEffect(() => {
    if (!socket || !isOpen || !effectiveId) return;

    const handleUpdate = (payload) => {
      const updatedId = payload?.id || payload?.ticket_id || payload?.ticketId;
      if (!updatedId || String(updatedId) === String(effectiveId)) {
        fetchFullTicket(true);
      }
    };

    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);
    socket.on('service_report:created', handleUpdate);
    socket.on('service_report_created', handleUpdate);

    return () => {
      socket.off('ticket:updated', handleUpdate);
      socket.off('ticket_updated', handleUpdate);
      socket.off('service_report:created', handleUpdate);
      socket.off('service_report_created', handleUpdate);
    };
  }, [socket, isOpen, effectiveId, fetchFullTicket]);

  if (!isOpen && !activeTicket) return null;

  // Check if the service report has at least one photo uploaded
  const serviceReport = activeTicket?.serviceReport || activeTicket?.service_report || null;
  const reportPhotos = parseImageUrls(
    serviceReport?.images_urls ??
    serviceReport?.imagesUrls ??
    serviceReport?.image_urls ??
    serviceReport?.images ??
    activeTicket?.sr_images_urls
  );
  const hasPhotos = reportPhotos.length > 0;

  const currentStatus = activeTicket?.status || 'in_progress';
  const isClosed = currentStatus === 'closed';

  const getAvailableStatusOptions = (s) => {
    if (s === 'closed') return [{ value: 'closed', label: 'Closed' }];
    if (s === 'resolved') return [{ value: 'resolved', label: 'Resolved' }];
    if (s === 'in_progress') {
      return [
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolve' },
      ];
    }
    return [
      { value: 'open', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'resolved', label: 'Resolve' },
    ];
  };

  const statusOptions = getAvailableStatusOptions(currentStatus);

  // Block resolve if no photos have been submitted in the service report
  const isResolvingWithoutPhotos = status === 'resolved' && !hasPhotos;

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (isResolvingWithoutPhotos) {
      toast.error('Please file a service report with at least one photo before marking this ticket as resolved.');
      return;
    }

    if (!activeTicket?.id) return;

    setUpdating(true);
    try {
      const res = await api.put(`/tickets/${activeTicket.id}`, {
        status,
        note,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update: ${activeTicket?.ticket_number || ''}`}
      maxWidth="max-w-lg"
    >
      {!activeTicket && loadingDetails ? (
        <div className="py-12 flex justify-center">
          <Loader text="Loading ticket details..." />
        </div>
      ) : activeTicket ? (
        <div className="space-y-4">
          {/* Ticket Info Box */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <h3 className="text-sm font-bold text-white leading-snug flex-1 min-w-0 pr-2">
                {activeTicket.title || activeTicket.subject}
              </h3>
              <Badge variant={activeTicket.priority === 'critical' ? 'danger' : 'cyan'} className="shrink-0">
                {activeTicket.priority}
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              <span className="text-slate-400 font-medium">Customer: </span>
              {activeTicket.customer_name}
              {activeTicket.customer_contact ? ` (${activeTicket.customer_contact})` : ''}
            </p>
            <p className="text-xs text-slate-300 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{activeTicket.customer_address || 'Address on file'}</span>
            </p>
            <p className="text-xs text-slate-300">
              <span className="text-slate-400 font-medium">Category: </span>{activeTicket.category_name}
            </p>
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
              <p className="text-xs text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-700/60 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                {activeTicket.description || activeTicket.subject || activeTicket.title || 'No detailed description provided.'}
              </p>
            </div>
          </div>

          {/* Service Report Photo Status Banner */}
          {!isClosed && (
            <div className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
              hasPhotos
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              {hasPhotos ? (
                <>
                  <Camera className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    <span className="font-bold">Service report filed</span> — {reportPhotos.length} photo{reportPhotos.length !== 1 ? 's' : ''} attached. Ticket can be resolved.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="flex-1">
                    <span className="font-bold block">No service photos submitted yet.</span>
                    <span className="text-amber-400/80">You must file a service report with at least one photo before resolving this ticket.</span>
                    {onOpenFileServiceReport && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onOpenFileServiceReport(activeTicket); }}
                        className="mt-1.5 inline-flex items-center gap-1 text-amber-300 font-bold underline underline-offset-2 hover:text-amber-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        File Service Report Now
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Header */}
          <div className="pt-1">
            <span className="text-xs font-bold text-white font-display">Service Progress & Update</span>
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
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setUserSelectedStatus(true);
                  }}
                  disabled={statusOptions.length <= 1}
                  className="glass-input w-full rounded-xl py-3 px-3 text-sm bg-slate-900 text-white disabled:opacity-60"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Inline warning when trying to resolve without photos */}
                {isResolvingWithoutPhotos && (
                  <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    A service report with photos is required to resolve this ticket.
                  </p>
                )}
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

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-sm"
                isLoading={updating}
                icon={Send}
                disabled={isResolvingWithoutPhotos}
              >
                Save Status & Progress
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </Modal>
  );
};

export default UpdateTicketModal;