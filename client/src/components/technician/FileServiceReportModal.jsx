import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { FileText, Camera, Send, X, RefreshCw } from 'lucide-react';
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

const FileServiceReportModal = ({ isOpen, onClose, ticket, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [customerNameSigned, setCustomerNameSigned] = useState('');
  const [isComplete, setIsComplete] = useState(true);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Files
  const [files, setFiles] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (ticket) {
      setTitle(`Service Completion Report - ${ticket.ticket_number}`);
    }
  }, [ticket]);

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

  const openCamera = useCallback(async (facing = 'environment') => {
    setCameraOpen(true);
    setCameraFacing(facing);
    setCameraReady(false);
    setCameraError('');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: { exact: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (exactErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => setCameraReady(true)).catch(console.error);
        };
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError('Unable to access camera. Please check camera permissions in your browser.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError('');
  }, []);

  const switchCamera = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    openCamera(next);
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticket) return toast.error('No ticket selected');
    if (!workPerformed.trim()) return toast.error('Work performed description is required');

    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('ticketId', ticket.id);
      formData.append('title', title || `Service Completion Report - ${ticket.ticket_number}`);
      formData.append('workPerformed', workPerformed);
      formData.append('materialsUsed', materialsUsed);
      formData.append('completionNotes', completionNotes);
      formData.append('customerNameSigned', customerNameSigned);
      formData.append('isComplete', isComplete);

      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append('images', compressed);
      }

      const res = await api.post('/service-reports', formData);
      if (res.success) {
        toast.success('Service Report submitted successfully!');
        setWorkPerformed('');
        setMaterialsUsed('');
        setCompletionNotes('');
        setCustomerNameSigned('');
        setFiles([]);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit service report');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="File Service Report" maxWidth="max-w-lg">
        {ticket && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ticket Summary */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-mono text-xs text-cyan-400 font-bold">{ticket.ticket_number}</span>
              <p className="text-white font-bold text-sm leading-snug">{ticket.title}</p>
              <p className="text-xs text-slate-400">Customer: {ticket.customer_name}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Report Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Starlink Dish Alignment & Router Setup"
                className="glass-input w-full rounded-xl py-3 px-3 text-sm bg-slate-900 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Work Performed *</label>
              <textarea
                rows={3}
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                placeholder="Describe all technical tasks executed..."
                className="glass-input w-full rounded-xl p-3 text-sm bg-slate-900 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Materials & Parts Used</label>
              <textarea
                rows={2}
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                placeholder="e.g. 15m Cat6 cable, 2x RJ45 connectors"
                className="glass-input w-full rounded-xl p-3 text-sm bg-slate-900 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Additional Completion Notes</label>
              <textarea
                rows={2}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Customer verified speed test at 150 Mbps"
                className="glass-input w-full rounded-xl p-3 text-sm bg-slate-900 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Sign-off Name</label>
              <input
                type="text"
                value={customerNameSigned}
                onChange={(e) => setCustomerNameSigned(e.target.value)}
                placeholder="Customer or representative full name"
                className="glass-input w-full rounded-xl py-3 px-3 text-sm bg-slate-900 text-white"
              />
            </div>

            {/* Photos & Camera */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">Work Proof Photos ({files.length})</span>
              </div>

              {/* Camera buttons stacked on mobile */}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => openCamera('environment')} className="w-full justify-center">
                  📷 Rear Camera
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => openCamera('user')} className="w-full justify-center">
                  🤳 Front Camera
                </Button>
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="w-full rounded-xl py-2.5 px-3 text-xs text-slate-300 bg-slate-950/60 border border-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-400"
              />

              {files.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={URL.createObjectURL(file)} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" variant="success" className="w-full py-3 text-sm" isLoading={submitLoading} icon={Send}>
              Submit Field Service Report
            </Button>
          </form>
        )}
      </Modal>

      {/* Fullscreen Camera Portal — exact matching original implementation */}
      {cameraOpen &&
        ReactDOM.createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.85)' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera style={{ width: 16, height: 16, color: '#60a5fa' }} />
                {cameraFacing === 'environment' ? '📷 Rear Camera' : '🤳 Front Camera'}
              </span>
              <button
                type="button"
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

              {/* Corner framing guides */}
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
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady || !!cameraError}
                style={{ width: 72, height: 72, borderRadius: '50%', background: (!cameraReady || !!cameraError) ? '#555' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)', transition: 'transform 0.1s' }}
              >
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #9ca3af' }} />
              </button>

              {/* Switch camera button */}
              <button
                type="button"
                onClick={switchCamera}
                disabled={!cameraReady || !!cameraError}
                title="Switch camera"
                style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!cameraReady || !!cameraError) ? 0.4 : 1 }}
              >
                <RefreshCw style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={stopCamera}
              style={{ margin: '0 auto 20px', padding: '8px 36px', borderRadius: 999, background: '#2563eb', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Done — Use {files.length} Photo{files.length !== 1 ? 's' : ''}
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

export default FileServiceReportModal;
