import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { UserCheck, Check, X, Clock, Mail, Phone, MapPin, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianApproval = () => {
  const [pendingTechs, setPendingTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/technicians/pending');
      if (res.success) {
        setPendingTechs(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (techId, name) => {
    try {
      const res = await api.post(`/technicians/${techId}/approve`);
      if (res.success) {
        toast.success(`Approved technician account for ${name}!`);
        fetchPending();
      }
    } catch (e) {
      toast.error('Failed to approve technician');
    }
  };

  const handleReject = async () => {
    if (!selectedTech) return;
    try {
      const res = await api.post(`/technicians/${selectedTech.id}/reject`, { reason: rejectReason });
      if (res.success) {
        toast.success(`Rejected application for ${selectedTech.full_name}`);
        setRejectModalOpen(false);
        fetchPending();
      }
    } catch (e) {
      toast.error('Failed to reject technician');
    }
  };

  if (loading) return <Loader text="Checking for pending technician registrations..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Technician Application Approvals</h1>
        <p className="text-xs text-slate-400">Review newly registered field technicians before granting system access</p>
      </div>

      {pendingTechs.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-display">All Caught Up!</h3>
          <p className="text-xs text-slate-400 mt-1">There are no pending technician applications requiring approval.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingTechs.map((tech) => (
            <Card key={tech.id} glow className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                    {tech.employee_id}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5">{tech.full_name}</h3>
                  <span className="text-xs text-slate-400">{tech.department || 'Field Operations'}</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pending Review
                </span>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-cyan-400" /> {tech.email}</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-cyan-400" /> {tech.contact_number}</p>
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {tech.address || 'Address not specified'}</p>
                <p className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-cyan-400" /> Specialization: <span className="font-semibold text-white">{tech.specialization || 'General'}</span></p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() => handleApprove(tech.id, tech.full_name)}
                  icon={Check}
                >
                  Approve Technician
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setSelectedTech(tech);
                    setRejectModalOpen(true);
                  }}
                  icon={X}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Technician Registration">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Please state the reason for rejecting <span className="font-bold text-white">{selectedTech?.full_name}</span>:
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Invalid Employee ID or unverified credentials..."
            className="glass-input w-full rounded-xl p-3 text-sm"
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TechnicianApproval;
