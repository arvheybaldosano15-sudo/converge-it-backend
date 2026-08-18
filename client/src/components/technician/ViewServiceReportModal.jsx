import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Loader from '../common/Loader';
import { FileText, CheckCircle, User, Calendar, Wrench, Package, ShieldCheck, X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const ViewServiceReportModal = ({ isOpen, onClose, ticketId, ticket }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const idToUse = ticketId || ticket?.id;
        if (!idToUse) return;

        const res = await api.get(`/tickets/${idToUse}`);
        if (res.success && res.data) {
          setReport(res.data.serviceReport || null);
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load service report details');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, ticketId, ticket]);

  if (!isOpen) return null;

  const currentTicketNumber = ticket?.ticket_number || report?.ticket_number || 'Work Order';
  const currentTitle = ticket?.title || ticket?.subject || report?.ticket_title || 'Field Service Call';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Service Report: ${currentTicketNumber}`} maxWidth="max-w-2xl">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader text="Retrieving archived service report..." />
          </div>
        ) : !report ? (
          <div className="py-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-500 mx-auto opacity-60" />
            <p className="text-sm font-bold text-slate-300">No Service Report Filed</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This ticket was marked completed or closed directly without an attached digital field service report.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Header Summary */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg">
                  {currentTicketNumber}
                </span>
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Report Filed
                </Badge>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">{report.title || currentTitle}</h3>

              <div className="flex flex-wrap items-center gap-4 text-slate-400 pt-1 text-[11px] border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> Technician: <strong className="text-slate-200">{report.technician_name || 'Assigned Technician'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Filed: <strong className="text-slate-200">{new Date(report.created_at).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            {/* Work Performed */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Work Performed & Findings
              </h4>
              <p className="text-xs text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-700/60 leading-relaxed whitespace-pre-wrap">
                {report.work_performed || 'No work description entered.'}
              </p>
            </div>

            {/* Materials & Completion Notes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-cyan-400" /> Materials / Equipment Used
                </h4>
                <p className="text-xs text-slate-200">
                  {report.materials_used || 'None listed'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Customer Sign-off
                </h4>
                <p className="text-xs text-slate-200 font-bold">
                  {report.customer_name_signed ? `✍️ ${report.customer_name_signed}` : 'Verified on site'}
                </p>
              </div>
            </div>

            {/* Additional Completion Notes if present */}
            {report.completion_notes && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Additional Notes</h4>
                <p className="text-xs text-slate-300 italic">"{report.completion_notes}"</p>
              </div>
            )}

            {/* Work Proof Photos */}
            {report.images_urls && report.images_urls.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Work Proof Photos ({report.images_urls.length})
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {report.images_urls.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhoto(imgUrl)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer hover:opacity-90 transition-all hover:scale-105"
                    >
                      <img src={imgUrl} alt={`Proof photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Full Size Image Preview Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-950/80 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedPhoto} alt="Full resolution proof" className="w-full h-full object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </>
  );
};

export default ViewServiceReportModal;
