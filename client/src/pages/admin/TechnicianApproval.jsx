import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { CheckCircle, XCircle, Clock, Phone, ShieldAlert, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianApproval = () => {
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [modalReason, setModalReason] = useState('');

  const fetchTechs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/technicians/pending');
      if (res.success) {
        setTechs(res.data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load technician applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  const handleApprove = async (techId, name) => {
    try {
      const res = await api.post(`/technicians/${techId}/approve`);
      if (res.success) {
        toast.success(`Approved technician account for ${name}! Account status is now Active.`);
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve technician');
    }
  };

  const handleReject = async () => {
    if (!selectedTech) return;
    try {
      const res = await api.post(`/technicians/${selectedTech.id}/reject`, { reason: modalReason });
      if (res.success) {
        toast.success(`Rejected application for ${selectedTech.full_name}`);
        setRejectModalOpen(false);
        setModalReason('');
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject technician');
    }
  };

  const handleSuspend = async () => {
    if (!selectedTech) return;
    try {
      const res = await api.post(`/technicians/${selectedTech.id}/suspend`, { reason: modalReason });
      if (res.success) {
        toast.success(`Suspended account for ${selectedTech.full_name}`);
        setSuspendModalOpen(false);
        setModalReason('');
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to suspend technician');
    }
  };

  const filteredTechs = techs.filter((t) => {
    if (activeTab === 'pending') return t.status === 'pending';
    if (activeTab === 'active') return t.status === 'active';
    if (activeTab === 'suspended') return t.status === 'inactive';
    if (activeTab === 'rejected') return t.status === 'rejected';
    return true;
  });

  const getTabCount = (statusKey) => {
    if (statusKey === 'pending') return techs.filter((t) => t.status === 'pending').length;
    if (statusKey === 'active') return techs.filter((t) => t.status === 'active').length;
    if (statusKey === 'suspended') return techs.filter((t) => t.status === 'inactive').length;
    if (statusKey === 'rejected') return techs.filter((t) => t.status === 'rejected').length;
    return 0;
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success">
            <ShieldCheck className="w-3 h-3 inline mr-1" /> Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="warning">
            <AlertTriangle className="w-3 h-3 inline mr-1" /> Suspended
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger">
            <XCircle className="w-3 h-3 inline mr-1" /> Rejected
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="warning">
            <Clock className="w-3 h-3 inline mr-1" /> Pending Review
          </Badge>
        );
    }
  };

  const columns = [
    {
      header: 'Employee ID & Name',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-cyan-400 block">{row.employee_id}</span>
          <span className="font-semibold text-white text-sm">{row.full_name}</span>
          <span className="text-[11px] text-slate-400 block">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (row) => (
        <p className="text-xs text-slate-300 flex items-center gap-1">
          <Phone className="w-3 h-3 text-cyan-400 shrink-0" /> {row.contact_number}
        </p>
      ),
    },
    {
      header: 'Specialization & Dept',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-white block">{row.specialization || 'General Installation'}</span>
          <span className="text-[11px] text-slate-400">{row.department || 'Field Services'}</span>
        </div>
      ),
    },
    {
      header: 'Registered On',
      cell: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => renderStatusBadge(row.status),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-1.5">
          {/* Approve / Re-Activate */}
          {row.status !== 'active' && (
            <button
              onClick={() => handleApprove(row.id, row.full_name)}
              className="p-1.5 rounded-lg glass-panel hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1 text-xs px-2"
              title="Approve / Activate Technician"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
          )}

          {/* Suspend */}
          {row.status !== 'inactive' && (
            <button
              onClick={() => {
                setSelectedTech(row);
                setModalReason('');
                setSuspendModalOpen(true);
              }}
              className="p-1.5 rounded-lg glass-panel hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1 text-xs px-2"
              title="Suspend Technician Access"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </button>
          )}

          {/* Reject */}
          {row.status !== 'rejected' && (
            <button
              onClick={() => {
                setSelectedTech(row);
                setModalReason('');
                setRejectModalOpen(true);
              }}
              className="p-1.5 rounded-lg glass-panel hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 text-xs px-2"
              title="Reject Technician Application"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Technician Approvals & Status</h1>
          <p className="text-xs text-slate-400">Manage technician registrations, approvals, rejections, and portal suspensions</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 space-x-1">
          {[
            { key: 'pending', label: 'Pending' },
            { key: 'active', label: 'Active' },
            { key: 'suspended', label: 'Suspended' },
            { key: 'rejected', label: 'Rejected' },
          ].map((tab) => {
            const count = getTabCount(tab.key);
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    active ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTechs}
        isLoading={loading}
        emptyMessage={`No technicians found in ${activeTab} status.`}
      />

      {/* Reject Reason Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Technician Application">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Please state the reason for rejecting <span className="font-bold text-white">{selectedTech?.full_name}</span>:
          </p>
          <textarea
            rows={3}
            value={modalReason}
            onChange={(e) => setModalReason(e.target.value)}
            placeholder="e.g. Invalid Employee ID or unverified credentials..."
            className="glass-input w-full rounded-xl p-3 text-sm"
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Reason Modal */}
      <Modal isOpen={suspendModalOpen} onClose={() => setSuspendModalOpen(false)} title="Suspend Technician Account">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            State the reason for suspending <span className="font-bold text-white">{selectedTech?.full_name}</span>'s portal access:
          </p>
          <textarea
            rows={3}
            value={modalReason}
            onChange={(e) => setModalReason(e.target.value)}
            placeholder="e.g. Administrative review, temporary leave, or policy compliance..."
            className="glass-input w-full rounded-xl p-3 text-sm"
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setSuspendModalOpen(false)}>Cancel</Button>
            <Button variant="warning" onClick={handleSuspend}>Confirm Suspension</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TechnicianApproval;
