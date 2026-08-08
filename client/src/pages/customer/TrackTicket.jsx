import React, { useState } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { Search, Ticket, Clock, CheckCircle2, MapPin, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const TrackTicket = () => {
  const [ticketNum, setTicketNum] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!ticketNum.trim()) return toast.error('Please enter a ticket number');

    setLoading(true);
    try {
      // Search ticket by ticket_number
      const res = await api.get('/tickets', { params: { search: ticketNum } });
      if (res.success && res.data.length > 0) {
        setTicket(res.data[0]);
      } else {
        setTicket(null);
        toast.error('No ticket found with that reference number.');
      }
    } catch (e) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-12 max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-cyan-500/20">
          C
        </div>
        <h1 className="text-2xl font-bold text-white font-display">Track Support Ticket</h1>
        <p className="text-xs text-slate-400">Enter your ticket reference number (e.g. CIT-2024-00001) to view status</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleTrack} className="flex gap-3">
          <Input
            placeholder="e.g. CIT-2024-00001"
            value={ticketNum}
            onChange={(e) => setTicketNum(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="primary" isLoading={loading} icon={Search}>
            Track Ticket
          </Button>
        </form>
      </Card>

      {ticket && (
        <Card glow className="space-y-4">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <span className="font-mono text-xs font-bold text-cyan-400">{ticket.ticket_number}</span>
              <h3 className="text-lg font-bold text-white mt-1">{ticket.title}</h3>
            </div>
            <Badge variant={ticket.status === 'resolved' ? 'success' : 'cyan'}>
              {ticket.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Category:</span>
              <p className="font-semibold text-white mt-0.5">{ticket.category_name}</p>
            </div>
            <div>
              <span className="text-slate-400">Estimated Resolution Time:</span>
              <p className="font-semibold text-cyan-300 mt-0.5">{ticket.ai_eta_hours ? `${ticket.ai_eta_hours} Hours` : '24-48 Hours'}</p>
            </div>
            <div>
              <span className="text-slate-400">Assigned Technician:</span>
              <p className="font-semibold text-white mt-0.5">{ticket.assignee_name || 'Assigned to Field Operations'}</p>
            </div>
            <div>
              <span className="text-slate-400">Submitted On:</span>
              <p className="font-semibold text-white mt-0.5">{new Date(ticket.created_at).toLocaleString()}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TrackTicket;
