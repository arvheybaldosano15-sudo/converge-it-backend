import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { getUploadUrl } from '../../utils/urlHelper';
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
  X
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
        setFiles((prev) => [...prev, file]);
        toast.success('Photo captured!');
      },
      'image/jpeg',
      0.92
    );
  }, [cameraFacing]);

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

      files.forEach((file) => {
        formData.append('images', file);
      });

      const res = await api.post('/service-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        toast.success('Service Report uploaded successfully!');
        // Reset form & reload list
        setTitle('');
        setWorkPerformed('');
        setMaterialsUsed('');
        setCompletionNotes('');
        setCustomerNameSigned('');
        setFiles([]);
        setGpsAddress('');
        fetchReports();
        setActiveTab('list');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload service report');
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
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
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
                {/* Rear Camera */}
                <button
                  type="button"
                  onClick={() => openCamera('environment')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  Rear Cam
                </button>

                {/* Front Camera */}
                <button
                  type="button"
                  onClick={() => openCamera('user')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7h-3a2 2 0 0 1-2-2l-1-2H10L9 5a2 2 0 0 1-2 2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  Front Cam
                </button>

                {/* Gallery */}
                <button
                  type="button"
                  onClick={() => document.getElementById('photo-gallery').click()}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border border-slate-600/40 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-[11px] font-semibold transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Gallery
                </button>
              </div>

              {/* Previews */}
              {files.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-blue-300 font-semibold flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> {files.length} photo(s) selected:
                  </p>
                  <div className="flex flex-wrap gap-2">
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
              <h3 className="text-base font-bold text-white">{selectedReport.title}</h3>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Work Performed</span>
              <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3 rounded-xl border border-slate-800 mt-1">
                {selectedReport.work_performed}
              </p>
            </div>

            {selectedReport.materials_used && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Materials / Equipment</span>
                <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 mt-1">
                  {selectedReport.materials_used}
                </p>
              </div>
            )}

            {/* Uploaded Service Photos Gallery */}
            {selectedReport.images_urls && selectedReport.images_urls.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-blue-400" /> Service & Installation Photos ({selectedReport.images_urls.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {selectedReport.images_urls.map((url, i) => (
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
                          e.target.src = 'https://placehold.co/600x400/0f172a/38bdf8?text=Photo+Unavailable';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span>Customer Signed: <strong className="text-white">{selectedReport.customer_name_signed || 'Yes'}</strong></span>
              <span>Submitted: <strong className="text-white">{new Date(selectedReport.created_at).toLocaleDateString()}</strong></span>
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
