import React, { useState } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import {
  Ticket,
  Edit,
  MapPin,
  FileText,
  Send,
  Camera,
  Navigation,
  X,
  CheckCircle,
  Clock,
  User,
  Wrench,
  Lock
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTickets } from '../../hooks/useTickets';
import toast from 'react-hot-toast';

const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name || 'photo.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
};

const AssignedTickets = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: ticketsData, isLoading: loading } = useTickets({ page, limit: 10 });
  const tickets = ticketsData?.data || ticketsData || [];
  const totalPages = ticketsData?.pagination?.totalPages || 1;

  // ── Update Modal State ──
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('in_progress');
  const [modalNote, setModalNote] = useState('');
  const [modalResolutionSummary, setModalResolutionSummary] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // ── File Service Report Modal State ──
  const [reportTicket, setReportTicket] = useState(null);
  const [isFileReportModalOpen, setIsFileReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [customerNameSigned, setCustomerNameSigned] = useState('');
  const [files, setFiles] = useState([]);
  const [gpsLatitude, setGpsLatitude] = useState(null);
  const [gpsLongitude, setGpsLongitude] = useState(null);
  const [gpsAddress, setGpsAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Open Update Modal
  const handleOpenUpdateModal = (ticketRow, e) => {
    if (e) e.stopPropagation();
    setSelectedTicket(ticketRow);
    setModalStatus(ticketRow.status || 'open');
    setModalNote('');
    setModalResolutionSummary(ticketRow.resolution_summary || '');
    setIsUpdateModalOpen(true);
  };

  // Open File Service Report Modal
  const handleOpenFileReportModal = (ticketRow, e) => {
    if (e) e.stopPropagation();
    setReportTicket(ticketRow);
    setReportTitle(`Service Completion Report for Ticket #${ticketRow.ticket_number}`);
    setWorkPerformed('');
    setMaterialsUsed('');
    setCompletionNotes('');
    setCustomerNameSigned('');
    setFiles([]);
    setGpsLatitude(null);
    setGpsLongitude(null);
    setGpsAddress('');
    setIsFileReportModalOpen(true);
  };

  // Handle Ticket Status Update Submission
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setIsSavingStatus(true);
    try {
      const res = await api.put(`/tickets/${selectedTicket.id}`, {
        status: modalStatus,
        note: modalNote,
        resolutionSummary: modalResolutionSummary,
      });

      if (res.success) {
        toast.success('Ticket updated successfully!');
        setIsUpdateModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket');
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Capture GPS coordinates
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude);
        setGpsLongitude(position.coords.longitude);
        setGpsAddress(`GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        setIsLocating(false);
        toast.success('GPS coordinates captured!');
      },
      () => {
        setIsLocating(false);
        toast.error('Failed to capture GPS coordinates');
      }
    );
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        return [...prev, ...newFiles.filter((f) => !existing.has(`${f.name}-${f.size}`))];
      });
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle Service Report Submission
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportTicket) return;
    if (!workPerformed.trim()) return toast.error('Work performed description is required');

    setIsSubmittingReport(true);
    try {
      const formData = new FormData();
      formData.append('ticketId', reportTicket.id);
      formData.append('title', reportTitle || `Service Report for #${reportTicket.ticket_number}`);
      formData.append('workPerformed', workPerformed);
      formData.append('materialsUsed', materialsUsed);
      formData.append('completionNotes', completionNotes);
      formData.append('customerNameSigned', customerNameSigned);
      formData.append('isComplete', 'true');
      if (gpsLatitude) formData.append('gpsLatitude', gpsLatitude);
      if (gpsLongitude) formData.append('gpsLongitude', gpsLongitude);
      if (gpsAddress) formData.append('gpsAddress', gpsAddress);

      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append('images', compressed);
      }

      const res = await api.post('/service-reports', formData);
      if (res.success) {
        toast.success('Service report filed successfully!');
        setIsFileReportModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to file service report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Dynamic status transition dropdown options
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

  const columns = [
    {
      header: 'Ticket #',
      cell: (row) => <span className="font-mono text-xs font-bold text-cyan-400">{row.ticket_number}</span>,
    },
    {
      header: 'Task & Customer',
      cell: (row) => (
        <div>
          <p className="font-bold text-white text-sm line-clamp-1">{row.title || row.subject}</p>
          <span className="text-[11px] text-slate-400">{row.customer_name} • {row.category_name}</span>
        </div>
      ),
    },
    {
      header: 'Priority',
      cell: (row) => (
        <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'cyan'}>
          {row.priority}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (row) => {
        const variantMap = {
          open: 'warning',
          in_progress: 'primary',
          on_hold: 'purple',
          resolved: 'success',
          closed: 'default'
        };
        const displayStatus = row.status === 'open' ? 'pending' : row.status;
        return (
          <Badge variant={variantMap[row.status] || 'default'} className="capitalize">
            {displayStatus ? displayStatus.replace('_', ' ') : ''}
          </Badge>
        );
      }
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => handleOpenUpdateModal(row, e)}
            icon={Edit}
          >
            Update
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={(e) => handleOpenFileReportModal(row, e)}
            icon={FileText}
          >
            Report
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Assigned Support Tasks</h1>
        <p className="text-xs text-slate-400">Field work orders assigned to you</p>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        isLoading={loading}
        onRowClick={(row) => handleOpenUpdateModal(row)}
        emptyMessage="No assigned tickets found."
      />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={10} onPageChange={setPage} />

      {/* ── UPDATE TICKET MODAL ── */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title=""
        maxWidth="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-5">
            {/* Header & Badges */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3 pr-8">
              <div>
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md">
                  {selectedTicket.ticket_number}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5 font-display">{selectedTicket.title || selectedTicket.subject}</h3>
              </div>
              <Badge variant={selectedTicket.priority === 'critical' ? 'danger' : 'cyan'}>
                {selectedTicket.priority} Priority
              </Badge>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <p className="text-slate-300"><span className="text-slate-400 font-medium">Customer:</span> <strong className="text-white">{selectedTicket.customer_name}</strong> ({selectedTicket.customer_contact || 'No contact'})</p>
              <p className="text-slate-300 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {selectedTicket.customer_address || 'Address on file'}</p>
              <p className="text-slate-300"><span className="text-slate-400 font-medium">Service Category:</span> <strong className="text-cyan-300">{selectedTicket.category_name}</strong></p>
            </div>

            {/* Description */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Concern Description</span>
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>

            {/* Status Update Form or Locked Notice */}
            {selectedTicket.status === 'closed' ? (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 text-xs text-center space-y-1">
                <p className="font-bold text-slate-300 text-sm flex items-center justify-center gap-1.5"><Lock className="w-4 h-4 text-amber-400" /> Ticket Closed</p>
                <p>This ticket has been closed by the administrator. Status updates are locked.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveStatus} className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Update Progress & Status</h4>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={(e) => {
                      setIsUpdateModalOpen(false);
                      handleOpenFileReportModal(selectedTicket, e);
                    }}
                    icon={FileText}
                  >
                    File Service Report
                  </Button>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    disabled={getAvailableStatusOptions(selectedTicket.status).length <= 1}
                    className="glass-input w-full rounded-xl py-2.5 px-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {getAvailableStatusOptions(selectedTicket.status).map((opt) => (
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
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="e.g. Arrived on site. Testing Starlink dish alignment..."
                    className="glass-input w-full rounded-xl p-3 text-sm bg-slate-950/80 text-white"
                  />
                </div>

                {modalStatus === 'resolved' && (
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Final Resolution Summary</label>
                    <textarea
                      rows={3}
                      value={modalResolutionSummary}
                      onChange={(e) => setModalResolutionSummary(e.target.value)}
                      placeholder="Explain what was done to fix the concern..."
                      className="glass-input w-full rounded-xl p-3 text-sm bg-slate-950/80 text-white"
                      required
                    />
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full py-2.5" isLoading={isSavingStatus} icon={Send}>
                  Save Status & Progress
                </Button>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* ── FILE SERVICE REPORT MODAL ── */}
      <Modal
        isOpen={isFileReportModalOpen}
        onClose={() => setIsFileReportModalOpen(false)}
        title=""
        maxWidth="max-w-2xl"
      >
        {reportTicket && (
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 pr-8">
              <div className="flex items-center space-x-2 text-cyan-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white font-display">File Field Service Completion Report</h3>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md">
                #{reportTicket.ticket_number}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-300"><span className="text-slate-400 font-medium">Customer:</span> <strong className="text-white">{reportTicket.customer_name}</strong></p>
              <p className="text-slate-300"><span className="text-slate-400 font-medium">Service Category:</span> <strong className="text-cyan-300">{reportTicket.category_name}</strong></p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="glass-input w-full rounded-xl py-2 px-3 bg-slate-950/80 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                  Work Performed <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  placeholder="Describe technical actions taken, cabling, alignment, or replacements..."
                  className="glass-input w-full rounded-xl p-3 bg-slate-950/80 text-white text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">Materials / Equipment Used</label>
                  <textarea
                    rows={2}
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    placeholder="e.g. Cat6 Cable 15m, RJ45 connectors x4..."
                    className="glass-input w-full rounded-xl p-2.5 bg-slate-950/80 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">Completion Notes</label>
                  <textarea
                    rows={2}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="e.g. Signal speed verified at 120 Mbps. Customer oriented..."
                    className="glass-input w-full rounded-xl p-2.5 bg-slate-950/80 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">Customer Printed / Signed Name</label>
                <input
                  type="text"
                  value={customerNameSigned}
                  onChange={(e) => setCustomerNameSigned(e.target.value)}
                  placeholder="e.g. John Doe (Customer)"
                  className="glass-input w-full rounded-xl py-2 px-3 bg-slate-950/80 text-white text-xs"
                />
              </div>

              {/* Photos & GPS Location Upload */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-cyan-400" /> Installation Proof Photos ({files.length})
                  </span>

                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={isLocating}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                  >
                    <Navigation className="w-3 h-3" /> {isLocating ? 'Capturing GPS...' : gpsAddress || 'Capture GPS Location'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" /> Add Photos
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-400">Supported: JPG, PNG, WEBP (Auto-compressed)</span>
                </div>

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {files.map((file, i) => (
                      <div key={i} className="relative group bg-slate-950 rounded-lg p-1 border border-slate-800 flex items-center gap-1 text-[11px] text-slate-300">
                        <span className="max-w-[120px] truncate pl-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" variant="success" className="w-full py-3" isLoading={isSubmittingReport} icon={CheckCircle}>
              Submit Service Completion Report
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AssignedTickets;
