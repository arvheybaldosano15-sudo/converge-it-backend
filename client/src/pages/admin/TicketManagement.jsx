import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import {
  Ticket,
  Plus,
  Filter,
  UserPlus,
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Eye,
  Trash2,
  Edit,
  Send,
  MessageSquare,
  FileText,
  Camera
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const TicketManagement = () => {
  const { searchQuery } = useOutletContext() || {};
  const { socket } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    categoryId: '',
    assignedTo: '',
    priority: 'medium',
    title: '',
    description: '',
    customerAddress: '',
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        search: searchQuery,
      };
      const res = await api.get('/tickets', { params });
      if (res.success) {
        setTickets(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [techRes, custRes] = await Promise.all([
        api.get('/technicians?status=active&limit=100'),
        api.get('/customers?limit=100'),
      ]);
      if (techRes.success) setTechnicians(techRes.data);
      if (custRes.success) setCustomers(custRes.data);
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = () => {
      fetchTickets();
    };
    socket.on('ticket:updated', handleStatusUpdate);
    socket.on('ticket:status_changed', handleStatusUpdate);
    socket.on('ticket:resolved', handleStatusUpdate);
    return () => {
      socket.off('ticket:updated', handleStatusUpdate);
      socket.off('ticket:status_changed', handleStatusUpdate);
      socket.off('ticket:resolved', handleStatusUpdate);
    };
  }, [socket]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/tickets', formData);
      if (res.success) {
        toast.success('Ticket created successfully');
        setIsCreateModalOpen(false);
        fetchTickets();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create ticket');
    }
  };

  const handleAssignTechnician = async (ticketId, technicianId) => {
    try {
      const res = await api.put(`/tickets/${ticketId}`, { assignedTo: technicianId });
      if (res.success) {
        toast.success('Technician assigned successfully');
        fetchTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(res.data);
        }
      }
    } catch (err) {
      toast.error('Failed to assign technician');
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      const res = await api.put(`/tickets/${ticketId}`, { status });
      if (res.success) {
        toast.success(`Ticket status updated to ${status}`);
        fetchTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(res.data);
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      const res = await api.delete(`/tickets/${ticketToDelete.id}`);
      if (res.success) {
        toast.success('Ticket deleted');
        setIsDeleteConfirmOpen(false);
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to delete ticket');
    }
  };

  const viewTicketDetail = async (ticket) => {
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      if (res.success) {
        setSelectedTicket(res.data);
        setIsDetailModalOpen(true);
      }
    } catch (e) {
      setSelectedTicket(ticket);
      setIsDetailModalOpen(true);
    }
  };

  const columns = [
    {
      header: 'Ticket #',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-cyan-400">{row.ticket_number}</span>
      ),
    },
    {
      header: 'Title & Category',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100 text-sm line-clamp-1">{row.title}</p>
          <span className="text-[11px] text-slate-400">{row.category_name}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-200">{row.customer_name}</p>
          <p className="text-slate-400 text-[10px]">{row.customer_contact}</p>
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
        const getStatusVariant = (status) => {
          switch (status) {
            case 'open': return 'warning';
            case 'in_progress': return 'cyan';
            case 'resolved': return 'success';
            case 'closed': return 'secondary';
            case 'cancelled': return 'danger';
            case 'on_hold': return 'warning';
            default: return 'cyan';
          }
        };
        const statusText = row.status ? row.status.replace('_', ' ') : 'open';
        return (
          <Badge variant={getStatusVariant(row.status)} className="capitalize font-semibold">
            {statusText}
          </Badge>
        );
      },
    },
    {
      header: 'Assignee',
      cell: (row) => {
        if (row.assigned_to || row.assignee_name) {
          return (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs font-semibold text-cyan-300 max-w-[150px]">
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span className="truncate">{row.assignee_name || 'Assigned'}</span>
            </div>
          );
        }

        return (
          <select
            value={row.assigned_to || ''}
            onChange={(e) => handleAssignTechnician(row.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="glass-input text-xs rounded-lg py-1 px-2 border-slate-700 bg-slate-900 max-w-[140px]"
          >
            <option value="">Select Technician...</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => viewTicketDetail(row)}
            className="p-1.5 rounded-lg glass-panel hover:bg-slate-800 text-cyan-400 hover:text-cyan-300"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setTicketToDelete(row);
              setIsDeleteConfirmOpen(true);
            }}
            className="p-1.5 rounded-lg glass-panel hover:bg-rose-500/20 text-rose-400"
            title="Delete Ticket"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Support Ticket Management</h1>
          <p className="text-xs text-slate-400">Search, monitor, prioritize, assign and track tickets</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="flex flex-wrap items-center gap-3 py-3 px-4">
        <Filter className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-slate-300 mr-2">Filter By:</span>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input text-xs rounded-xl py-1.5 px-3"
        >
          <option value="" className="bg-slate-900">All Statuses</option>
          <option value="open" className="bg-slate-900">Open</option>
          <option value="in_progress" className="bg-slate-900">In Progress</option>
          <option value="on_hold" className="bg-slate-900">On Hold</option>
          <option value="resolved" className="bg-slate-900">Resolved</option>
          <option value="closed" className="bg-slate-900">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="glass-input text-xs rounded-xl py-1.5 px-3"
        >
          <option value="" className="bg-slate-900">All Priorities</option>
          <option value="critical" className="bg-slate-900">Critical</option>
          <option value="high" className="bg-slate-900">High</option>
          <option value="medium" className="bg-slate-900">Medium</option>
          <option value="low" className="bg-slate-900">Low</option>
        </select>

        {(statusFilter || priorityFilter || categoryFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setPriorityFilter('');
              setCategoryFilter('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </Card>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={tickets}
        isLoading={loading}
        onRowClick={viewTicketDetail}
        emptyMessage="No tickets found matching criteria."
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={10}
        onPageChange={setPage}
      />

      {/* Create Ticket Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Support Ticket">
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Customer</label>
            <select
              className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              required
            >
              <option value="" className="bg-slate-900">Select Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.full_name || 'Customer'} ({c.contact_number || c.messenger_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Category</label>
              <select
                className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="" className="bg-slate-900">Select Category...</option>
                <option value="starlink_internet" className="bg-slate-900">Starlink Internet</option>
                <option value="cctv_system" className="bg-slate-900">CCTV System</option>
                <option value="smart_devices" className="bg-slate-900">Smart Devices</option>
                <option value="installation" className="bg-slate-900">Installation Request</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Priority</label>
              <select
                className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low" className="bg-slate-900">Low</option>
                <option value="medium" className="bg-slate-900">Medium</option>
                <option value="high" className="bg-slate-900">High</option>
                <option value="critical" className="bg-slate-900">Critical</option>
              </select>
            </div>
          </div>

          <Input
            label="Ticket Title"
            placeholder="e.g. Starlink dish disconnections during heavy rain"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Description</label>
            <textarea
              rows={3}
              className="glass-input w-full rounded-xl p-3 text-sm"
              placeholder="Detailed description of concern..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <Input
            label="Service Address"
            placeholder="Full customer installation address"
            value={formData.customerAddress}
            onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
          />

          <div className="pt-2 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Ticket Details: ${selectedTicket?.ticket_number || ''}`} maxWidth="max-w-3xl">
        {selectedTicket && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Customer:</span>
                <p className="font-bold text-white text-sm mt-0.5">{selectedTicket.customer_name}</p>
                <p className="text-slate-400">{selectedTicket.customer_contact}</p>
              </div>
              <div>
                <span className="text-slate-400">Priority & Category:</span>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge variant={selectedTicket.priority === 'critical' ? 'danger' : 'cyan'}>
                    {selectedTicket.priority}
                  </Badge>
                  <span className="text-slate-200">{selectedTicket.category_name}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400">Assigned Technician:</span>
                <p className="font-semibold text-cyan-300 mt-0.5">{selectedTicket.assignee_name || 'Unassigned'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-1">{selectedTicket.title}</h4>
              <p className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {selectedTicket.description}
              </p>
            </div>

            {selectedTicket.ai_priority && (
              <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-500/30 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Classification Insights</span>
                </div>
                <p className="text-xs text-slate-300">
                  Recommended Priority: <span className="font-bold text-white capitalize">{selectedTicket.ai_priority}</span> • Estimated Resolution: <span className="font-bold text-cyan-300">{selectedTicket.ai_eta_hours || 24} hours</span>
                </p>
              </div>
            )}

            {/* Field Service Report Submitted by Technician */}
            {selectedTicket.serviceReport && (
              <div className="bg-slate-900/80 p-4 rounded-xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Field Service Completion Report</span>
                  </div>
                  <Badge variant="success">Completed Report</Badge>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Report Title</span>
                  <h4 className="text-sm font-bold text-white">{selectedTicket.serviceReport.title}</h4>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Work Performed</span>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mt-1">
                    {selectedTicket.serviceReport.work_performed}
                  </p>
                </div>

                {selectedTicket.serviceReport.materials_used && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Materials / Equipment Used</span>
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mt-1">
                      {selectedTicket.serviceReport.materials_used}
                    </p>
                  </div>
                )}

                {/* Proof Photos Gallery */}
                {selectedTicket.serviceReport.images_urls && selectedTicket.serviceReport.images_urls.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-blue-400" /> Service & Installation Photos ({selectedTicket.serviceReport.images_urls.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                      {selectedTicket.serviceReport.images_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video block"
                        >
                          <img
                            src={url}
                            alt={`Proof Photo ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <span>Customer Acknowledged: <strong className="text-white">{selectedTicket.serviceReport.customer_name_signed || 'Signed'}</strong></span>
                  <span>Submitted by: <strong className="text-blue-300">{selectedTicket.serviceReport.technician_name || selectedTicket.assignee_name || 'Technician'}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTicket}
        title="Delete Support Ticket"
        message={`Are you sure you want to permanently delete ticket ${ticketToDelete?.ticket_number}?`}
      />
    </div>
  );
};

export default TicketManagement;
