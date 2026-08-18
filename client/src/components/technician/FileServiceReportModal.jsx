import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../utils/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { FileText, MapPin, Camera, Navigation, Send, X } from 'lucide-react';
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

  // GPS state
  const [gpsLatitude, setGpsLatitude] = useState(null);
  const [gpsLongitude, setGpsLongitude] = useState(null);
  const [gpsAddress, setGpsAddress] = useState('');
  const [locating, setLocating] = useState(false);

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
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        return [...prev, ...newFiles.filter((f) => !existing.has(`${f.name}-${f.size}`))];
      });
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const openCamera = useCallback(async (facing) => {
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
      setCameraError('Unable to access camera. Please check camera permissions.');
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError('');
  }, []);

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

      if (gpsLatitude) formData.append('gpsLatitude', gpsLatitude);
      if (gpsLongitude) formData.append('gpsLongitude', gpsLongitude);
      if (gpsAddress) formData.append('gpsAddress', gpsAddress);

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
      <Modal isOpen={isOpen} onClose={onClose} title="File Field Service Report" maxWidth="max-w-2xl">
        {ticket && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="font-mono text-cyan-400 font-bold">{ticket.ticket_number}</span>
              <p className="text-white font-bold text-sm">{ticket.title}</p>
              <p className="text-slate-400">Customer: {ticket.customer_name}</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Report Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Starlink Dish Alignment & Router Setup"
                className="glass-input w-full rounded-xl py-2 px-3 text-xs bg-slate-900 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Work Performed *</label>
              <textarea
                rows={3}
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                placeholder="Describe all technical tasks executed..."
                className="glass-input w-full rounded-xl p-3 text-xs bg-slate-900 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Materials & Parts Used</label>
                <textarea
                  rows={2}
                  value={materialsUsed}
                  onChange={(e) => setMaterialsUsed(e.target.value)}
                  placeholder="e.g. 15m Cat6 cable, 2x RJ45 connectors"
                  className="glass-input w-full rounded-xl p-2.5 text-xs bg-slate-900 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Additional Completion Notes</label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Customer verified speed test at 150 Mbps"
                  className="glass-input w-full rounded-xl p-2.5 text-xs bg-slate-900 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Customer Sign-off Name</label>
              <input
                type="text"
                value={customerNameSigned}
                onChange={(e) => setCustomerNameSigned(e.target.value)}
                placeholder="Customer or representative full name"
                className="glass-input w-full rounded-xl py-2 px-3 text-xs bg-slate-900 text-white"
              />
            </div>

            {/* GPS Location Capture */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" /> GPS Tagging
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={captureLocation} isLoading={locating}>
                  {gpsLatitude ? 'Recapture Location' : 'Capture GPS'}
                </Button>
              </div>
              {gpsAddress && (
                <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {gpsAddress}
                </p>
              )}
            </div>

            {/* Installation Photos & Camera Capture */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" /> Work Proof Photos ({files.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openCamera('environment')}>
                    📷 Rear Camera
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openCamera('user')}>
                    🤳 Front Camera
                  </Button>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="glass-input w-full rounded-xl py-1.5 px-3 text-xs bg-slate-900 text-slate-300"
              />

              {files.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={URL.createObjectURL(file)} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" variant="success" className="w-full py-3 text-xs" isLoading={submitLoading} icon={Send}>
              Submit Field Service Report
            </Button>
          </form>
        )}
      </Modal>

      {/* Camera Fullscreen Overlay */}
      {cameraOpen &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] bg-black flex flex-col justify-between">
            <div className="p-4 flex justify-between items-center bg-slate-950/80 z-10">
              <span className="text-xs font-bold text-white font-mono">
                {cameraFacing === 'environment' ? '📷 Rear Camera' : '🤳 Front Camera'}
              </span>
              <button type="button" onClick={closeCamera} className="p-2 text-white bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <p className="text-red-400 text-xs text-center p-4">{cameraError}</p>
              ) : (
                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
              )}
            </div>

            <div className="p-6 bg-slate-950/90 flex justify-center items-center z-10">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="w-16 h-16 rounded-full bg-white border-4 border-cyan-500 shadow-xl active:scale-95 transition-transform"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default FileServiceReportModal;
