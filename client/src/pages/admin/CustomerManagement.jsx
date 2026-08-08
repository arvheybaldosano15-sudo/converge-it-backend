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
import { Users, Phone, MapPin, Ticket, MessageSquare, Plus, User, Hash, Compass } from 'lucide-react';
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

  // Form State for Adding Customer
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    completeAddress: '',
    nearbyLandmark: '',
    accountNumber: '',
    messengerPsid: '',
  });

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
      console.error(e);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, searchQuery]);

  const viewCustomer = (cust) => {
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!formData.fullName) {
      toast.error('Customer name is required');
      return;
    }
    try {
      const res = await api.post('/customers', formData);
      if (res.success) {
        toast.success(res.message || 'Customer added successfully');
        setIsAddModalOpen(false);
        setFormData({
          fullName: '',
          contactNumber: '',
          completeAddress: '',
          nearbyLandmark: '',
          accountNumber: '',
          messengerPsid: '',
        });
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add customer');
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Customer Directory</h1>
          <p className="text-xs text-slate-400">Customer directory with account numbers and linked Messenger profiles</p>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={Plus}>
          Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={loading}
        onRowClick={viewCustomer}
        emptyMessage="No customers found."
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        itemsPerPage={10}
        onPageChange={setPage}
      />

      {/* Customer Detail Modal */}
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
          </div>
        )}
      </Modal>

      {/* Add Customer Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Customer">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <Input
            label="Customer Full Name *"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter customer full name"
            icon={User}
            required
          />

          <Input
            label="Account Number (Optional)"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleInputChange}
            placeholder="Auto-generated if left blank"
            icon={Hash}
          />

          <Input
            label="Contact Number"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleInputChange}
            placeholder="Enter contact number"
            icon={Phone}
          />

          <Input
            label="Complete Address"
            name="completeAddress"
            value={formData.completeAddress}
            onChange={handleInputChange}
            placeholder="Enter complete installation address"
            icon={MapPin}
          />

          <Input
            label="Nearby Landmark"
            name="nearbyLandmark"
            value={formData.nearbyLandmark}
            onChange={handleInputChange}
            placeholder="e.g. Near Barangay Hall, Beside Bakery"
            icon={Compass}
          />

          <Input
            label="Messenger PSID (Optional)"
            name="messengerPsid"
            value={formData.messengerPsid}
            onChange={handleInputChange}
            placeholder="Enter Facebook Messenger PSID if linked"
            icon={MessageSquare}
          />

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerManagement;
