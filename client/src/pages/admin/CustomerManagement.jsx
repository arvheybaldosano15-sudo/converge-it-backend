import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Loader from '../../components/common/Loader';
import {
  Users, Phone, MapPin, Ticket, Plus, User, Hash,
  Compass, Eye, Pencil, Trash2, Search, Filter, ArrowUpDown,
  Clock, CheckCircle, AlertCircle, ShieldAlert, Calendar, RefreshCw,
  ExternalLink, UserCheck, Activity, Layers, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Defined OUTSIDE the parent component to prevent focus loss on re-render ───
const CustomerForm = ({ formData, onChange, onSubmit, onCancel, submitLabel, isEdit = false }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    {/* Section 1: Customer Information */}
    <div className="space-y-2">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
        <User className="w-3.5 h-3.5" />
        <span>Customer Information</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Customer Full Name *"
          name="fullName"
          value={formData.fullName || ''}
          onChange={onChange}
          placeholder="e.g. Juan dela Cruz"
          icon={User}
          required
        />
        <Input
          label="Contact Number"
          name="contactNumber"
          value={formData.contactNumber || ''}
          onChange={onChange}
          placeholder="e.g. 09123456789"
          icon={Phone}
        />
      </div>
    </div>

    {/* Section 2: Account Information */}
    <div className="space-y-2">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
        <Hash className="w-3.5 h-3.5" />
        <span>Account & Integration Details</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Account Number (Optional)"
          name="accountNumber"
          value={formData.accountNumber || ''}
          onChange={onChange}
          placeholder={isEdit ? "Account Number" : "Auto-generated if left blank"}
          icon={Hash}
        />

      </div>
    </div>

    {/* Section 3: Location Information */}
    <div className="space-y-2">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
        <MapPin className="w-3.5 h-3.5" />
        <span>Location & Address</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <Input
          label="Complete Installation Address"
          name="completeAddress"
          value={formData.completeAddress || ''}
          onChange={onChange}
          placeholder="e.g. Brgy. Malungon, Sarangani Province"
          icon={MapPin}
        />
        <Input
          label="Nearby Landmark"
          name="nearbyLandmark"
          value={formData.nearbyLandmark || ''}
          onChange={onChange}
          placeholder="e.g. Near Barangay Hall, Beside Elementary School"
          icon={Compass}
        />
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
      <Button variant="ghost" type="button" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" type="submit">
        {submitLabel}
      </Button>
    </div>
  </form>
);

const CustomerManagement = () => {
  const { searchQuery: globalSearch } = useOutletContext() || {};
  const navigate = useNavigate();

  // Data States
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [localSearch, setLocalSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals & Customer Detail
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Form State
  const emptyForm = {
    fullName: '',
    contactNumber: '',
    completeAddress: '',
    nearbyLandmark: '',
    accountNumber: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const activeSearch = localSearch || globalSearch || '';

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const [custRes, statsRes] = await Promise.all([
        api.get('/customers', {
          params: { page, limit: 10, search: activeSearch, filter, sortBy, sortOrder },
        }),
        api.get('/customers/stats').catch(() => null),
      ]);

      if (custRes.success) {
        setCustomers(custRes.data || []);
        setTotalPages(custRes.pagination?.totalPages || 1);
        setTotalItems(custRes.pagination?.total || 0);
      }
      if (statsRes && statsRes.success) {
        setStats(statsRes.data || {});
      }
    } catch (e) {
      console.error('Failed to load customers:', e);
      toast.error('Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, activeSearch, filter, sortBy, sortOrder]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // View Customer Detailed Profile
  const viewCustomerProfile = async (cust, e) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/customers/${cust.id}`);
      if (res.success) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load customer details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Pre-fill Edit Modal
  const openEditModal = (cust, e) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setFormData({
      fullName: cust.full_name || '',
      contactNumber: cust.contact_number || '',
      completeAddress: cust.complete_address || '',
      nearbyLandmark: cust.nearby_landmark || '',
      accountNumber: cust.account_number || '',
    });
    setIsEditModalOpen(true);
  };

  // Delete Confirm
  const openDeleteConfirm = (cust, e) => {
    e?.stopPropagation();
    setCustomerToDelete(cust);
    setIsDeleteConfirmOpen(true);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.fullName.trim()) {
      toast.error('Customer full name is required');
      return;
    }
    try {
      const res = await api.post('/customers', formData);
      if (res.success) {
        toast.success(res.message || 'Customer added successfully');
        setIsAddModalOpen(false);
        setFormData(emptyForm);
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add customer');
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!formData.fullName || !formData.fullName.trim()) {
      toast.error('Customer full name is required');
      return;
    }
    try {
      const res = await api.put(`/customers/${selectedCustomer.id}`, formData);
      if (res.success) {
        toast.success('Customer updated successfully');
        setIsEditModalOpen(false);
        setFormData(emptyForm);
        fetchCustomers();
        if (customerDetail && customerDetail.id === selectedCustomer.id) {
          viewCustomerProfile(selectedCustomer);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const res = await api.delete(`/customers/${customerToDelete.id}`);
      if (res.success) {
        toast.success('Customer deleted successfully');
        setIsDeleteConfirmOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  const resetFilters = () => {
    setLocalSearch('');
    setFilter('');
    setSortBy('created_at');
    setSortOrder('DESC');
    setPage(1);
  };

  // SLA Helper for ticket badges inside profile
  const getSlaStatus = (slaDeadline, status) => {
    if (['resolved', 'closed'].includes(status)) {
      return { text: 'RESOLVED', variant: 'success' };
    }
    if (!slaDeadline) return { text: 'WITHIN SLA', variant: 'success' };
    const now = new Date();
    const deadline = new Date(slaDeadline);
    if (deadline < now) return { text: 'BREACHED', variant: 'danger' };
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    if (diffHours <= 4) return { text: 'AT RISK', variant: 'warning' };
    return { text: 'WITHIN SLA', variant: 'success' };
  };

  // KPI Summary Cards Data
  const summaryCards = [
    {
      label: 'Total Customers',
      count: parseInt(stats.total_customers) || totalItems || 0,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-500',
      active: !filter,
      onClick: () => resetFilters()
    },
    {
      label: 'Active Customers',
      count: parseInt(stats.active_customers) || 0,
      icon: UserCheck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500',
      active: filter === 'active',
      onClick: () => { setFilter('active'); setPage(1); }
    },
    {
      label: 'Open Ticket Customers',
      count: parseInt(stats.open_tickets_customers) || 0,
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500',
      active: filter === 'open_tickets',
      onClick: () => { setFilter('open_tickets'); setPage(1); }
    },
    {
      label: 'New Customers (30d)',
      count: parseInt(stats.new_customers) || 0,
      icon: Calendar,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500',
      active: sortBy === 'created_at' && !filter,
      onClick: () => { setSortBy('created_at'); setSortOrder('DESC'); setFilter(''); setPage(1); }
    },
  ];

  const columns = [
    {
      header: 'Account #',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-cyan-400">
          {row.account_number || '-'}
        </span>
      ),
    },
    {
      header: 'Customer Name',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-100 text-xs sm:text-sm">{row.full_name || 'Messenger Customer'}</p>
        </div>
      ),
    },
    {
      header: 'Contact Number',
      cell: (row) => row.contact_number ? (
        <span className="text-xs text-slate-200 font-medium">{row.contact_number}</span>
      ) : (
        <span className="text-slate-500 italic text-xs">Not provided</span>
      ),
    },
    {
      header: 'Address',
      cell: (row) => (
        <span className="text-xs text-slate-300 line-clamp-1 max-w-[200px]">
          {row.complete_address || '-'}
        </span>
      ),
    },
    {
      header: 'Total Tickets',
      cell: (row) => (
        <button
          onClick={(e) => viewCustomerProfile(row, e)}
          className="group"
          title="Click to view customer tickets"
        >
          <Badge
            variant={parseInt(row.open_tickets) > 0 ? 'warning' : parseInt(row.total_tickets) > 0 ? 'cyan' : 'secondary'}
            className="cursor-pointer group-hover:brightness-125 transition-all"
          >
            {row.total_tickets || 0} Tickets
          </Badge>
        </button>
      ),
    },
    {
      header: 'Last Activity',
      cell: (row) => row.last_activity ? (
        <span className="text-xs text-slate-300 font-medium">
          {new Date(row.last_activity).toLocaleDateString()}
        </span>
      ) : (
        <span className="text-slate-500 text-xs">—</span>
      ),
    },
    {
      header: 'Joined Date',
      cell: (row) => (
        <span className="text-xs text-slate-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          {/* View Profile */}
          <button
            onClick={(e) => viewCustomerProfile(row, e)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            title="View Detailed Customer Profile"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {/* Edit */}
          <button
            onClick={(e) => openEditModal(row, e)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
            title="Edit Customer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Delete */}
          <button
            onClick={(e) => openDeleteConfirm(row, e)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
            title="Delete Customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Customer Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Customer directory with account numbers and linked Messenger profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchCustomers} icon={RefreshCw} className="text-slate-400 hover:text-white">
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => { setFormData(emptyForm); setIsAddModalOpen(true); }}
            icon={Plus}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* 4 Clickable Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              onClick={card.onClick}
              className={`flex items-center gap-3 p-4 transition-all duration-200 border-l-4 border-t-0 border-r-0 border-b-0 ${card.border} ${
                card.active ? 'bg-slate-800/90 ring-1 ring-cyan-500/50 brightness-110' : 'bg-slate-900/70 hover:bg-slate-800/60'
              } cursor-pointer`}
            >
              <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xl font-extrabold font-display leading-none ${card.color}`}>{card.count}</h3>
                <p className="text-xs font-bold text-slate-200 mt-1 truncate">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4 space-y-3 bg-slate-950/70 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Search & Filter Directory</span>
          </div>
          {(localSearch || filter || sortBy !== 'created_at') && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-rose-400 hover:text-rose-300">
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name, Account #, Phone..."
              value={localSearch}
              onChange={(e) => { setLocalSearch(e.target.value); setPage(1); }}
              className="glass-input w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-700 bg-slate-900 text-white placeholder-slate-500"
            />
          </div>

          {/* Filter Status */}
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="">All Customers</option>
            <option value="active">Active Customers</option>
            <option value="open_tickets">With Open Tickets</option>
            <option value="no_tickets">With No Tickets</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="created_at">Recently Added</option>
            <option value="most_tickets">Most Tickets</option>
            <option value="account_number">Account Number</option>
            <option value="full_name">Customer Name</option>
            <option value="last_activity">Last Activity</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-300 hover:text-white flex items-center justify-between"
          >
            <span>Order:</span>
            <span className="font-bold text-cyan-400">{sortOrder === 'DESC' ? 'Descending' : 'Ascending'}</span>
          </button>
        </div>
      </Card>

      {/* Main Customer Table */}
      <DataTable
        columns={columns}
        data={customers}
        isLoading={loading}
        emptyMessage="No customer records found matching current search criteria."
      />

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{customers.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
          <span className="font-bold text-white">{Math.min(page * 10, totalItems)}</span> of{' '}
          <span className="font-bold text-cyan-400">{totalItems}</span> registered customer records
        </p>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      </div>

      {/* ADD CUSTOMER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer Record"
        maxWidth="max-w-2xl"
      >
        <CustomerForm
          formData={formData}
          onChange={handleInputChange}
          onSubmit={handleAddCustomer}
          onCancel={() => setIsAddModalOpen(false)}
          submitLabel="Save Customer"
          isEdit={false}
        />
      </Modal>

      {/* EDIT CUSTOMER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Customer — ${selectedCustomer?.full_name || ''}`}
        maxWidth="max-w-2xl"
      >
        <CustomerForm
          formData={formData}
          onChange={handleInputChange}
          onSubmit={handleEditCustomer}
          onCancel={() => setIsEditModalOpen(false)}
          submitLabel="Update Customer"
          isEdit={true}
        />
      </Modal>

      {/* DETAILED CUSTOMER PROFILE OVERVIEW MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title=""
        maxWidth="max-w-4xl"
      >
        {loadingDetail ? (
          <div className="p-8 text-center">
            <Loader text="Loading customer profile & ticket history..." />
          </div>
        ) : (selectedCustomer || customerDetail) ? (
          (() => {
            const cust = customerDetail || selectedCustomer;
            return (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white font-display">{cust.full_name || 'Messenger Customer'}</h2>
                      {cust.account_number && (
                        <Badge variant="cyan" className="font-mono">{cust.account_number}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Registration: <strong className="text-slate-200">{new Date(cust.created_at).toLocaleDateString()}</strong></span>
                      {cust.last_activity && (
                        <span>Last Activity: <strong className="text-cyan-300">{new Date(cust.last_activity).toLocaleDateString()}</strong></span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={(e) => { setIsDetailModalOpen(false); openEditModal(cust, e); }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate(`/admin/tickets?search=${encodeURIComponent(cust.full_name || cust.account_number)}`);
                      }}
                    >
                      View All Tickets
                    </Button>
                  </div>
                </div>

                {/* 5 Ticket Summary Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className="text-lg font-extrabold text-cyan-400 mt-0.5 block">{cust.total_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Open</span>
                    <span className="text-lg font-extrabold text-amber-400 mt-0.5 block">{cust.open_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">In Progress</span>
                    <span className="text-lg font-extrabold text-blue-400 mt-0.5 block">{cust.in_progress_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Resolved</span>
                    <span className="text-lg font-extrabold text-emerald-400 mt-0.5 block">{cust.resolved_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">SLA Breaches</span>
                    <span className="text-lg font-extrabold text-rose-400 mt-0.5 block">{cust.sla_breaches || 0}</span>
                  </div>
                </div>

                {/* Contact & Address Information Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Contact Details</span>
                    <p className="text-slate-300 flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Phone: <strong className="text-white">{cust.contact_number || 'Not specified'}</strong></span>
                    </p>

                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Installation Location</span>
                    <p className="text-slate-300 flex items-start gap-2 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Address: <strong className="text-white">{cust.complete_address || 'Not provided'}</strong></span>
                    </p>
                    {cust.nearby_landmark && (
                      <p className="text-slate-300 flex items-start gap-2 mt-1">
                        <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>Landmark: <strong className="text-white">{cust.nearby_landmark}</strong></span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Recent Support Tickets Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-display flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-cyan-400" />
                      Recent Support Tickets ({cust.recentTickets?.length || 0})
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Ticket ID</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Priority</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Assignee</th>
                          <th className="p-2.5">Created Date</th>
                          <th className="p-2.5 text-right">SLA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(!cust.recentTickets || cust.recentTickets.length === 0) ? (
                          <tr>
                            <td colSpan="7" className="p-4 text-center text-slate-500 text-xs">
                              No support tickets submitted by this customer yet.
                            </td>
                          </tr>
                        ) : (
                          cust.recentTickets.map((t) => {
                            const sla = getSlaStatus(t.sla_deadline, t.status);
                            return (
                              <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-cyan-400">{t.ticket_number}</td>
                                <td className="p-2.5 text-slate-200">{t.category_name || 'General Support'}</td>
                                <td className="p-2.5">
                                  <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'}>
                                    {t.priority}
                                  </Badge>
                                </td>
                                <td className="p-2.5">
                                  <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'} className="capitalize">
                                    {t.status ? t.status.replace('_', ' ') : 'open'}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-slate-300">{t.assignee_name || 'Unassigned'}</td>
                                <td className="p-2.5 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                                <td className="p-2.5 text-right">
                                  <Badge variant={sla.variant}>{sla.text}</Badge>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Professional Customer Activity Timeline */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white font-display flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Customer Activity & Support Timeline
                  </span>

                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {/* Customer Registration Entry */}
                    <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-200 font-semibold">
                          Customer Record Registered <span className="text-cyan-400">({cust.account_number})</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(cust.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Timeline Activity Array */}
                    {cust.activityTimeline && cust.activityTimeline.map((act, i) => (
                      <div key={i} className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                          <Ticket className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200">
                            Ticket <strong className="text-cyan-300">{act.ticket_number}</strong> updated to{' '}
                            <Badge variant="cyan" className="capitalize">{act.status_changed_to ? act.status_changed_to.replace('_', ' ') : 'updated'}</Badge>
                          </p>
                          {act.notes && <p className="text-slate-300 text-[11px] mt-0.5 italic">{act.notes}</p>}
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Record"
        message={`Are you sure you want to permanently delete customer record "${customerToDelete?.full_name}" (${customerToDelete?.account_number || ''})? This action cannot be undone.`}
      />
    </div>
  );
};

export default CustomerManagement;
