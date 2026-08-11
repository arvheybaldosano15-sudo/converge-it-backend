import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { Users, Phone, MapPin, Ticket, MessageSquare, Plus, User, Hash, Compass, Eye, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerManagement = () => {
  const { searchQuery } = useOutletContext() || {};
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Shared form state for Add & Edit
  const emptyForm = {
    fullName: '',
    contactNumber: '',
    completeAddress: '',
    nearbyLandmark: '',
    accountNumber: '',
    messengerPsid: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { page, limit: 10, search: searchQuery },
      });
      if (res.success) {
        setCustomers(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (e) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, searchQuery]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // View
  const viewCustomer = (cust, e) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
  };

  // Edit — prefill form
  const openEditModal = (cust, e) => {
    e?.stopPropagation();
    setSelectedCustomer(cust);
    setFormData({
      fullName: cust.full_name || '',
      contactNumber: cust.contact_number || '',
      completeAddress: cust.complete_address || '',
      nearbyLandmark: cust.nearby_landmark || '',
      accountNumber: cust.account_number || '',
      messengerPsid: cust.messenger_psid || '',
    });
    setIsEditModalOpen(true);
  };

  // Delete
  const openDeleteConfirm = (cust, e) => {
    e?.stopPropagation();
    setCustomerToDelete(cust);
    setIsDeleteConfirmOpen(true);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!formData.fullName) { toast.error('Customer name is required'); return; }
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
    try {
      const res = await api.put(`/customers/${selectedCustomer.id}`, formData);
      if (res.success) {
        toast.success('Customer updated successfully');
        setIsEditModalOpen(false);
        setFormData(emptyForm);
        fetchCustomers();
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
        toast.success('Customer deleted');
        setIsDeleteConfirmOpen(false);
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  const columns = [
    {
      header: 'Account #',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-cyan-400">{row.account_number || '-'}</span>
      ),
    },
    {
      header: 'Customer Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100 text-sm">{row.full_name || 'Messenger Customer'}</p>
          {row.messenger_psid && (
            <span className="text-[10px] text-slate-400 font-mono">PSID: {row.messenger_psid}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Number',
      cell: (row) => row.contact_number || <span className="text-slate-500 italic">Not provided</span>,
    },
    {
      header: 'Address',
      cell: (row) => <span className="text-xs text-slate-300 line-clamp-1">{row.complete_address || '-'}</span>,
    },
    {
      header: 'Total Tickets',
      cell: (row) => (
        <Badge variant="cyan">{row.total_tickets || 0} Tickets</Badge>
      ),
    },
    {
      header: 'Joined Date',
      cell: (row) => <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* View */}
          <button
            onClick={(e) => viewCustomer(row, e)}
            className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors"
            title="View Customer"
          >
            <Eye className="w-4 h-4" />
          </button>
          {/* Edit */}
          <button
            onClick={(e) => openEditModal(row, e)}
            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 transition-colors"
            title="Edit Customer"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* Delete */}
          <button
            onClick={(e) => openDeleteConfirm(row, e)}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors"
            title="Delete Customer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const CustomerForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Customer Full Name *" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Enter customer full name" icon={User} required />
        <Input label="Account Number (Optional)" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="Auto-generated if left blank" icon={Hash} />
        <Input label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="Enter contact number" icon={Phone} />
        <Input label="Messenger PSID (Optional)" name="messengerPsid" value={formData.messengerPsid} onChange={handleInputChange} placeholder="Enter Messenger PSID if linked" icon={MessageSquare} />
        <div className="sm:col-span-2">
          <Input label="Complete Address" name="completeAddress" value={formData.completeAddress} onChange={handleInputChange} placeholder="Enter complete installation address" icon={MapPin} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Nearby Landmark" name="nearbyLandmark" value={formData.nearbyLandmark} onChange={handleInputChange} placeholder="e.g. Near Barangay Hall, Beside Bakery" icon={Compass} />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <Button variant="ghost" type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
        <Button variant="primary" type="submit">{submitLabel}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Customer Directory</h1>
          <p className="text-xs text-slate-400">Customer directory with account numbers and linked Messenger profiles</p>
        </div>
        <Button variant="primary" onClick={() => { setFormData(emptyForm); setIsAddModalOpen(true); }} icon={Plus}>
          Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={loading}
        emptyMessage="No customers found."
      />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={10} onPageChange={setPage} />

      {/* View Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Customer Profile">
        {selectedCustomer && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-white">{selectedCustomer.full_name || 'Messenger User'}</h3>
                {selectedCustomer.account_number && (
                  <Badge variant="cyan" className="font-mono">{selectedCustomer.account_number}</Badge>
                )}
              </div>
              <p className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-cyan-400" /> {selectedCustomer.contact_number || 'N/A'}</p>
              <p className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {selectedCustomer.complete_address || 'N/A'}</p>
              {selectedCustomer.nearby_landmark && (
                <p className="text-slate-400 flex items-center gap-1.5 pl-5"><span className="text-[10px] uppercase text-cyan-500 font-bold">Landmark:</span> {selectedCustomer.nearby_landmark}</p>
              )}
              {selectedCustomer.messenger_psid && (
                <p className="text-slate-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> PSID: {selectedCustomer.messenger_psid}</p>
              )}
            </div>
            <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Support Requests Submitted:</span>
              <span className="font-bold text-cyan-300 text-sm">{selectedCustomer.total_tickets || 0}</span>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" size="sm" icon={Pencil} onClick={(e) => { setIsDetailModalOpen(false); openEditModal(selectedCustomer, e); }}>
                Edit Customer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Customer" maxWidth="max-w-2xl">
        <CustomerForm onSubmit={handleAddCustomer} submitLabel="Save Customer" />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Customer — ${selectedCustomer?.full_name || ''}`} maxWidth="max-w-2xl">
        <CustomerForm onSubmit={handleEditCustomer} submitLabel="Update Customer" />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer"
        message={`Are you sure you want to permanently delete "${customerToDelete?.full_name}"? This cannot be undone.`}
      />
    </div>
  );
};

export default CustomerManagement;
