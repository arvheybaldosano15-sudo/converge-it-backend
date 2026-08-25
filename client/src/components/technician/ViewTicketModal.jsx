import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Loader from '../common/Loader';
import { getUploadUrl, parseImageUrls } from '../../utils/urlHelper';
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
  Camera,
  History,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const getSlaInfo = (deadlineStr, status, resolvedAtStr) => {
  if (status === 'resolved' || status === 'closed') {
    if (deadlineStr) {
      const resolvedDate = resolvedAtStr ? new Date(resolvedAtStr) : new Date();
      const isMet = resolvedDate <= new Date(deadlineStr);
      return isMet
        ? { text: 'Completed Within SLA', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
        : { text: 'Completed (SLA Breached)', colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
    return { text: 'Completed', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
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
  const [selectedPhoto, setSelectedPhoto] = useState(null);

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
  const slaInfo = ticket ? getSlaInfo(ticket.sla_deadline, ticket.status, ticket.resolved_at || ticket.updated_at) : {};

  return (
    <>
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
                <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border whitespace-nowrap inline-flex items-center justify-center gap-1 ${slaInfo.colorClass}`}>
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



            {/* Filed Service Report Section if available */}
            {report && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-3">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Filed Field Service Report
                </h4>
                <p className="text-sm font-bold text-white">{report.title}</p>
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Work Performed:</span>
                  <p className="text-slate-200 bg-slate-950/70 p-2.5 rounded border border-slate-800 mt-0.5 leading-relaxed">{report.work_performed}</p>
                </div>
                {report.materials_used && (
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Materials Used:</span>
                    <p className="text-slate-300 mt-0.5">{report.materials_used}</p>
                  </div>
                )}
                {report.customer_name_signed && (
                  <p className="text-xs text-slate-300 pt-0.5">✍️ Signed by: <strong className="text-white">{report.customer_name_signed}</strong></p>
                )}

                {/* Submitted Work Proof Photos & Signature */}
                {(() => {
                  const photos = parseImageUrls(report.images_urls || report.imagesUrls || report.image_urls || report.images);
                  if (photos.length === 0 && !report.signature_url) return null;
                  return (
                    <div className="pt-2 space-y-3 border-t border-slate-800/80">
                      {photos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-cyan-400" /> Work Proof Photos ({photos.length})
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {photos.map((imgUrl, idx) => {
                              const fullUrl = getUploadUrl(imgUrl);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedPhoto(fullUrl)}
                                  className="aspect-square rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 cursor-pointer hover:border-cyan-400 transition-all hover:scale-105 group relative shadow-md"
                                >
                                  <img
                                    src={fullUrl}
                                    alt={`Work proof photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'https://via.placeholder.com/150?text=Photo+Unavailable';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ExternalLink className="w-4 h-4 text-cyan-300" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {report.signature_url && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-medium text-slate-400 block">Customer Signature:</span>
                          <div
                            onClick={() => setSelectedPhoto(getUploadUrl(report.signature_url))}
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

          </div>
        )}
      </Modal>

      {/* Full Resolution Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-[10000] bg-slate-950/90 sm:backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-900 shadow-2xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-slate-950/80 text-white rounded-full hover:bg-rose-600 transition-colors z-20 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedPhoto} alt="Full resolution service proof" className="w-full h-full object-contain max-h-[80vh] p-2" />
          </div>
        </div>
      )}
    </>
  );
};

export default ViewTicketModal;
