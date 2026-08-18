import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { ArrowLeft, Clock, MapPin, CheckCircle, FileText, Send, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const UpdateTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('in_progress');
  const [note, setNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/tickets/${id}`);
        if (res.success) {
          setTicket(res.data);
          setStatus(res.data.status);
          setResolutionSummary(res.data.resolution_summary || '');
        }
      } catch (e) {
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.put(`/tickets/${id}`, {
        status,
        note,
        resolutionSummary,
      });
      if (res.success) {
        toast.success('Ticket updated successfully!');
        setNote('');
        navigate('/technician/assigned');
      }
    } catch (e) {
      toast.error('Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loader text="Loading task details..." />;
  if (!ticket) return <div className="text-slate-400">Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">


      {/* Ticket Header Card */}
      <Card glow className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md">
              {ticket.ticket_number}
            </span>
            <h2 className="text-xl font-bold text-white mt-2">{ticket.title}</h2>
          </div>
          <Badge variant={ticket.priority === 'critical' ? 'danger' : 'cyan'}>
            {ticket.priority}
          </Badge>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
          <p className="text-slate-300"><span className="text-slate-400 font-medium">Customer:</span> {ticket.customer_name} ({ticket.customer_contact})</p>
          <p className="text-slate-300 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {ticket.customer_address || 'Address on file'}</p>
          <p className="text-slate-300"><span className="text-slate-400 font-medium">Service Category:</span> {ticket.category_name}</p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Issue Description</h4>
          <p className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800 leading-relaxed">
            {ticket.description}
          </p>
        </div>
      </Card>

      {/* Action Form */}
      <Card className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white font-display">Update Progress & Service Status</h3>
          <Button variant="success" size="sm" onClick={() => navigate(`/technician/reports/new?ticketId=${ticket.id}`)} icon={FileText}>
            File Service Report
          </Button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
            >
              <option value="open" className="bg-slate-900">Pending</option>
              <option value="in_progress" className="bg-slate-900">In Progress</option>
              <option value="resolved" className="bg-slate-900">Resolve</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Work Note / Progress Log</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Arrived on site. Testing Starlink dish alignment..."
              className="glass-input w-full rounded-xl p-3 text-sm"
            />
          </div>

          {status === 'resolved' && (
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Final Resolution Summary</label>
              <textarea
                rows={3}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Explain what was done to fix the concern..."
                className="glass-input w-full rounded-xl p-3 text-sm"
                required
              />
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full py-3" isLoading={updating} icon={Send}>
            Save Status & Progress
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default UpdateTicket;
