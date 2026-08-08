import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FileText, MapPin, Camera, CheckCircle, Navigation, Send, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ServiceReport = () => {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const navigate = useNavigate();

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

  // Image files
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

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
      (error) => {
        setLocating(false);
        toast.error('Failed to capture GPS coordinates');
      }
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketId) return toast.error('Ticket ID is required');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('ticketId', ticketId);
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
        navigate('/technician/assigned');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload service report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-xs text-slate-400 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white font-display">Field Service Report</h1>
        <p className="text-xs text-slate-400">Record completed work, GPS location, service photos, and customer signature</p>
      </div>

      <Card className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Report Title"
            placeholder="e.g. Starlink Dish Replacement & Alignment Complete"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Work Performed</label>
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
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Materials / Equipment Used</label>
            <textarea
              rows={2}
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              placeholder="e.g. 15m Cat6 Cable, Roof Mount Bracket, 4x Expansion Bolts"
              className="glass-input w-full rounded-xl p-3 text-sm"
            />
          </div>

          {/* GPS Location Capture */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" /> GPS Service Location Verification
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={captureLocation} isLoading={locating} icon={Navigation}>
                Capture Location
              </Button>
            </div>
            {gpsAddress ? (
              <p className="text-xs text-emerald-400 font-mono bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                ✓ {gpsAddress}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Click capture location to log field coordinates for audit verification.</p>
            )}
          </div>

          {/* Proof Photos Upload */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-400" /> Upload Installation / Service Photos
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="glass-input w-full rounded-xl p-2.5 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300"
            />
            {files.length > 0 && (
              <p className="text-xs text-cyan-300 font-medium">{files.length} photo(s) selected</p>
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
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
            <label htmlFor="isComplete" className="text-xs text-slate-200 font-semibold cursor-pointer">
              Mark Support Ticket as Resolved / Complete
            </label>
          </div>

          <Button type="submit" variant="primary" className="w-full py-3 font-bold" isLoading={loading} icon={Send}>
            Submit Service Report & Complete Ticket
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ServiceReport;
