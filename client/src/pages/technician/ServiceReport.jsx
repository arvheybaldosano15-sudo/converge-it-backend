import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { getUploadUrl, parseImageUrls } from '../../utils/urlHelper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import {
  FileText,
  MapPin,
  Camera,
  Navigation,
  Send,
  Plus,
  Search,
  CheckCircle,
  Eye,
  Calendar,
  User,
  Wrench,
  X,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const ServiceReport = () => {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const navigate = useNavigate();

  // Detect mobile device
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Mode: 'list' or 'create'
  const [activeTab, setActiveTab] = useState(ticketId ? 'create' : 'list');

  // Reports List State
  const [reports, setReports] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  // Form State
  const [formTicketId, setFormTicketId] = useState(ticketId || '');
  const [title, setTitle] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [customerNameSigned, setCustomerNameSigned] = useState('');
  const [isComplete, setIsComplete] = useState(true);

  // GPS state
  const [gpsLatitude, setGpsLatitude] = useState(null);
  const [gpsLongitude, setGpsLongitude] = useState(null);
  const [gpsAddress, setGpsAddress] = useState('');
  const [locating, setLocating] = useState(false);

  // Image files & submission
  const [files, setFiles] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Edit & Delete States
  const [editingReport, setEditingReport] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editWorkPerformed, setEditWorkPerformed] = useState('');
  const [editMaterialsUsed, setEditMaterialsUsed] = useState('');
  const [editCompletionNotes, setEditCompletionNotes] = useState('');
  const [editCustomerNameSigned, setEditCustomerNameSigned] = useState('');
  const [editIsComplete, setEditIsComplete] = useState(false);
  const [editFiles, setEditFiles] = useState([]);
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);

  const [modalUploadLoading, setModalUploadLoading] = useState(false);
  const [deletingReport, setDeletingReport] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenEdit = (report, e) => {
    if (e) e.stopPropagation();
    setEditingReport(report);
    setEditTitle(report.title || '');
    setEditWorkPerformed(report.work_performed || '');
    setEditMaterialsUsed(report.materials_used || '');
    setEditCompletionNotes(report.completion_notes || '');
    setEditCustomerNameSigned(report.customer_name_signed || '');
    setEditIsComplete(!!report.is_complete);
    setEditFiles([]);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingReport) return;
    setEditSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('workPerformed', editWorkPerformed);
      formData.append('materialsUsed', editMaterialsUsed);
      formData.append('completionNotes', editCompletionNotes);
      formData.append('customerNameSigned', editCustomerNameSigned);
      formData.append('isComplete', editIsComplete);

      for (const file of editFiles) {
        const compressed = await compressImage(file);
        formData.append('images', compressed);
      }

      const res = await api.put(`/service-reports/${editingReport.id}`, formData);
      if (res.success) {
        toast.success('Service report updated successfully!');
        setEditingReport(null);
        if (selectedReport && selectedReport.id === editingReport.id) {
          setSelectedReport(res.data);
        }
        fetchReports();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update service report');
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const handleModalPhotoUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedReport) return;
    setModalUploadLoading(true);
    try {
      const selectedFiles = Array.from(e.target.files);
      const formData = new FormData();
      for (const file of selectedFiles) {
        const compressed = await compressImage(file);
        formData.append('images', compressed);
      }

      const res = await api.put(`/service-reports/${selectedReport.id}`, formData);

      if (res.success) {
        toast.success('Photos uploaded successfully!');
        setSelectedReport(res.data);
        fetchReports();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload photos');
    } finally {
      setModalUploadLoading(false);
    }
  };

  const uploadFileToReport = async (file, report) => {
    if (!file || !report) return;
    setModalUploadLoading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('images', compressed);
      const res = await api.put(`/service-reports/${report.id}`, formData);
      if (res.success) {
        toast.success('Photo captured and uploaded!');
        setSelectedReport(res.data);
        fetchReports();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setModalUploadLoading(false);
    }
  };

  const handleOpenDelete = (report, e) => {
    if (e) e.stopPropagation();
    setDeletingReport(report);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingReport) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/service-reports/${deletingReport.id}`);
      if (res.success) {
        toast.success('Service report deleted successfully');
        if (selectedReport && selectedReport.id === deletingReport.id) {
          setSelectedReport(null);
        }
        setDeletingReport(null);
        fetchReports();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete service report');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Fetch submitted service reports
  const fetchReports = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/service-reports');
      if (res.success) {
        setReports(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (ticketId) {
      setFormTicketId(ticketId);
      setActiveTab('create');
    }
  }, [ticketId]);

  // Start camera stream
  const openCamera = useCallback(async (facing) => {
    setCameraError('');
    setCameraReady(false);
    setCameraFacing(facing);
    setCameraOpen(true);
    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      }, 100);
    } catch (err) {
      setCameraError(err.message || 'Camera access denied');
      setCameraReady(false);
    }
  }, []);

  // Switch camera facing
  const switchCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraFacing(newFacing);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setCameraError(err.message || 'Could not switch camera');
    }
  }, [cameraFacing]);

  // Stop camera stream and close
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError('');
  }, []);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    // Mirror front camera
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const filename = `photo-${cameraFacing}-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        if (selectedReport) {
          uploadFileToReport(file, selectedReport);
        } else {
          setFiles((prev) => [...prev, file]);
          toast.success('Photo captured!');
        }
      },
      'image/jpeg',
      0.92
    );
  }, [cameraFacing, selectedReport]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);


  const captureLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude);
        setGpsLongitude(position.coords.longitude);
        setGpsAddress(`GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        setLocating(false);
        toast.success('GPS coordinates captured!');
      },
      () => {
        setLocating(false);
        toast.error('Failed to capture GPS coordinates');
      }
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => {
        // Merge, avoiding exact duplicates by name+size
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        const merged = [...prev, ...newFiles.filter((f) => !existing.has(`${f.name}-${f.size}`))];
        return merged;
      });
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

// Compress image before upload to prevent payload timeout & 502 gateway errors
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formTicketId) return toast.error('Ticket ID is required');

    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('ticketId', formTicketId);
      formData.append('title', title || 'Field Service Completion Report');
      formData.append('workPerformed', workPerformed);
      formData.append('materialsUsed', materialsUsed);
      formData.append('completionNotes', completionNotes);
      formData.append('customerNameSigned', customerNameSigned);
      formData.append('isComplete', isComplete);
      if (gpsLatitude) formData.append('gpsLatitude', gpsLatitude);
      if (gpsLongitude) formData.append('gpsLongitude', gpsLongitude);
      if (gpsAddress) formData.append('gpsAddress', gpsAddress);

      // Compress photos before sending to guarantee fast upload and prevent 502 payload timeouts
      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append('images', compressed);
      }

      // Let Axios automatically set Content-Type with boundary for FormData
      const res = await api.post('/service-reports', formData);

      if (res.success) {
        toast.success('Service report submitted successfully!');
        setTitle('');
        setWorkPerformed('');
        setMaterialsUsed('');
        setCompletionNotes('');
        setCustomerNameSigned('');
        setFiles([]);
        fetchReports();
        setActiveTab('list');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit service report');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.ticket_number?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.work_performed?.toLowerCase().includes(q) ||
      r.customer_name_signed?.toLowerCase().includes(q)
    );
  });

  return (
    <>
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Field Service Reports</h1>
          <p className="text-xs text-slate-400">View submitted service documentation or create new completion reports</p>
        </div>

        {/* Action / View Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Submitted Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> New Report
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMITTED REPORTS LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports by ticket #, title, or work performed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200"
            />
          </div>

          {listLoading ? (
            <Loader text="Loading service reports..." />
          ) : filteredReports.length === 0 ? (
            <Card className="text-center py-12 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <h3 className="text-base font-bold text-white">No Service Reports Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You haven't submitted any field service reports yet. Select an assigned ticket to fill out a report.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => navigate('/technician/assigned')}>
                  View Assigned Tasks
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((r) => (
                <Card
                  key={r.id}
                  className="space-y-3 hover:border-blue-500/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(r)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                        {r.ticket_number || 'N/A'}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">{r.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.images_urls && r.images_urls.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                          <Camera className="w-3 h-3" /> {r.images_urls.length}
                        </span>
                      )}
                      {r.is_complete && (
                        <Badge variant="success">Completed</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {r.work_performed}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-400" /> {r.customer_name_signed || 'Signed'}
                    </span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center gap-1 text-slate-500 mr-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(r, e)}
                        title="Edit Service Report"
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all active:scale-95"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(r, e)}
                        title="Delete Service Report"
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE SERVICE REPORT FORM */}
      {activeTab === 'create' && (
        <Card className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!formTicketId && (
              <Input
                label="Ticket UUID / ID"
                placeholder="Enter Ticket ID"
                value={formTicketId}
                onChange={(e) => setFormTicketId(e.target.value)}
                required
              />
            )}

            <Input
              label="Report Title"
              placeholder="e.g. Starlink Dish Replacement & Alignment Complete"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Work Performed
              </label>
              <textarea
                rows={4}
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                placeholder="Describe work steps taken (e.g. Relocated Starlink dish to higher roof pole, re-crimped RJ45 connectors, verified speed tests...)"
                className="glass-input w-full rounded-xl p-3 text-sm"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Materials / Equipment Used
              </label>
              <textarea
                rows={2}
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                placeholder="e.g. 15m Cat6 Cable, Roof Mount Bracket, 4x Expansion Bolts"
                className="glass-input w-full rounded-xl p-3 text-sm"
              />
            </div>

            {/* Photo Capture Section */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" /> Installation / Service Photos
              </label>

              {/* Hidden gallery input */}
              <input
                id="photo-gallery"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* 3 buttons: Rear, Front, Gallery */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => openCamera('environment')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  <span>📷 Rear Cam</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCamera('user')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  <span>🤳 Front Cam</span>
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('photo-gallery')?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span>🖼️ Gallery</span>
                </button>
              </div>

              {/* Photo Previews */}
              {files.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-blue-400">
                      {files.length} Photo{files.length !== 1 ? 's' : ''} Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {files.map((file, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-blue-500/40 bg-slate-900 shrink-0 group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600/90 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Signature Name */}
            <Input
              label="Customer Full Name (Signed/Acknowledged)"
              placeholder="Name of customer present during service completion"
              value={customerNameSigned}
              onChange={(e) => setCustomerNameSigned(e.target.value)}
              required
            />

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="isComplete"
                checked={isComplete}
                onChange={(e) => setIsComplete(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="isComplete" className="text-xs text-slate-200 font-semibold cursor-pointer">
                Mark Support Ticket as Resolved / Complete
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 font-bold"
              isLoading={submitLoading}
              icon={Send}
            >
              Submit Service Report & Complete Ticket
            </Button>
          </form>
        </Card>
      )}

      {/* VIEW REPORT DETAILS MODAL */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Service Report — ${selectedReport.ticket_number}`}
        >
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Report Title</span>
              <h3 className="text-base font-bold text-white mt-0.5">{selectedReport.title}</h3>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Work Performed</span>
              <div className="mt-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedReport.work_performed}
              </div>
            </div>

            {selectedReport.materials_used && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Materials / Equipment</span>
                <div className="mt-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap">
                  {selectedReport.materials_used}
                </div>
              </div>
            )}

            {/* Uploaded Service Photos Gallery - VIEW ONLY */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 mb-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-400" /> Service & Installation Photos ({parseImageUrls(selectedReport.images_urls).length})
              </span>

              {parseImageUrls(selectedReport.images_urls).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {parseImageUrls(selectedReport.images_urls).map((url, i) => (
                    <a
                      key={i}
                      href={getUploadUrl(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video block"
                    >
                      <img
                        src={getUploadUrl(url)}
                        alt={`Service Photo ${i + 1}`}
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%230f172a'/%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='2'%3E%3Crect x='130' y='90' width='140' height='100' rx='10'/%3E%3Ccircle cx='200' cy='140' r='25'/%3E%3C/g%3E%3Ctext x='200' y='220' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'%3EPhoto Unavailable%3C/text%3E%3C/svg%3E";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-[10px] font-semibold bg-black/50 px-2 py-0.5 rounded-full">View full size</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
                  No photos attached to this report.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span>Customer Signed: <strong className="text-white">{selectedReport.customer_name_signed || 'Yes'}</strong></span>
              <span>Submitted: <strong className="text-white">{new Date(selectedReport.created_at).toLocaleDateString()}</strong></span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit}
                  onClick={() => {
                    const r = selectedReport;
                    setSelectedReport(null);
                    handleOpenEdit(r);
                  }}
                >
                  Edit Report
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    const r = selectedReport;
                    setSelectedReport(null);
                    handleOpenDelete(r);
                  }}
                >
                  Delete Report
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT REPORT MODAL */}
      {editingReport && (
        <Modal
          isOpen={!!editingReport}
          onClose={() => setEditingReport(null)}
          title={`Edit Service Report — ${editingReport.ticket_number || 'Report'}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="Report Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Work Performed
              </label>
              <textarea
                rows={3}
                value={editWorkPerformed}
                onChange={(e) => setEditWorkPerformed(e.target.value)}
                className="glass-input w-full rounded-xl p-3 text-sm"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Materials / Equipment Used
              </label>
              <textarea
                rows={2}
                value={editMaterialsUsed}
                onChange={(e) => setEditMaterialsUsed(e.target.value)}
                className="glass-input w-full rounded-xl p-3 text-sm"
              />
            </div>

            {/* Add New Photos in Edit Modal */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-blue-400" /> Add New Installation Photos
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setEditFiles(Array.from(e.target.files));
                  }
                }}
                className="text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
              />
              {editFiles.length > 0 && (
                <p className="text-[11px] text-blue-400 font-semibold mt-1">
                  {editFiles.length} new photo(s) selected to append.
                </p>
              )}
            </div>

            <Input
              label="Customer Full Name (Signed)"
              value={editCustomerNameSigned}
              onChange={(e) => setEditCustomerNameSigned(e.target.value)}
              required
            />

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="editIsComplete"
                checked={editIsComplete}
                onChange={(e) => setEditIsComplete(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="editIsComplete" className="text-xs text-slate-200 font-semibold cursor-pointer">
                Ticket Completed / Resolved
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingReport(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={editSubmitLoading} icon={Send}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingReport && (
        <Modal
          isOpen={!!deletingReport}
          onClose={() => setDeletingReport(null)}
          title="Delete Service Report"
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Are you sure you want to delete this report?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Report <strong className="text-slate-200">{deletingReport.title}</strong> will be permanently removed.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setDeletingReport(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" isLoading={deleteLoading} icon={Trash2} onClick={handleDeleteConfirm}>
                Delete Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>

      {/* Camera overlay — rendered via portal directly on document.body to cover sidebar+navbar */}
      {cameraOpen && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.85)' }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera style={{ width: 16, height: 16, color: '#60a5fa' }} />
              {cameraFacing === 'environment' ? '📷 Rear Camera' : '🤳 Front Camera'}
            </span>
            <button
              onClick={stopCamera}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Video feed */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
            {cameraError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
                <Camera style={{ width: 48, height: 48, color: '#f87171', opacity: 0.6, marginBottom: 12 }} />
                <p style={{ color: '#fca5a5', fontWeight: 700, marginBottom: 4 }}>Camera Error</p>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>{cameraError}</p>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Allow camera permission in your browser settings, then try again.</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
              />
            )}

            {/* Loading spinner */}
            {!cameraReady && !cameraError && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#fff', fontSize: 13 }}>Starting camera…</p>
              </div>
            )}

            {/* Corner guides */}
            {cameraReady && (
              <>
                <div style={{ position: 'absolute', top: 24, left: 24, width: 32, height: 32, borderTop: '2px solid rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.5)', borderRadius: '4px 0 0 0', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 24, right: 24, width: 32, height: 32, borderTop: '2px solid rgba(255,255,255,0.5)', borderRight: '2px solid rgba(255,255,255,0.5)', borderRadius: '0 4px 0 0', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 24, left: 24, width: 32, height: 32, borderBottom: '2px solid rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.5)', borderRadius: '0 0 0 4px', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 24, right: 24, width: 32, height: 32, borderBottom: '2px solid rgba(255,255,255,0.5)', borderRight: '2px solid rgba(255,255,255,0.5)', borderRadius: '0 0 4px 0', pointerEvents: 'none' }} />
              </>
            )}
          </div>

          {/* Controls */}
          <div style={{ background: 'rgba(0,0,0,0.85)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 60, textAlign: 'center' }}>
              {files.length > 0 && (
                <span style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>{files.length} taken</span>
              )}
            </div>

            {/* Shutter */}
            <button
              onClick={capturePhoto}
              disabled={!cameraReady || !!cameraError}
              style={{ width: 72, height: 72, borderRadius: '50%', background: (!cameraReady || !!cameraError) ? '#555' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)', transition: 'transform 0.1s' }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.88)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #9ca3af' }} />
            </button>

            {/* Switch cam */}
            <button
              onClick={switchCamera}
              disabled={!cameraReady || !!cameraError}
              title="Switch camera"
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!cameraReady || !!cameraError) ? 0.4 : 1 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"/>
                <path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"/>
              </svg>
            </button>
          </div>

          {/* Done */}
          <button
            onClick={stopCamera}
            style={{ margin: '0 auto 20px', padding: '8px 36px', borderRadius: 999, background: '#2563eb', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Done — Use {files.length} Photo{files.length !== 1 ? 's' : ''}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>,
        document.body
      )}
    </>
  );
};

export default ServiceReport;
