import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { User, Mail, Phone, MapPin, Wrench, Shield, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianProfile = () => {
  const { user, updateUserProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [specialization, setSpecialization] = useState(user?.specialization || 'Field Services');
  const [loading, setLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', { fullName, contactNumber, address, specialization });
      if (res.success) {
        updateUserProfile(res.data);
        toast.success('Technician profile updated');
      }
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (res.success) {
        toast.success('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Technician Profile</h1>
        <p className="text-xs text-slate-400">Employee ID: <span className="font-mono text-cyan-400 font-bold">{user?.employeeId}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              {user?.fullName?.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{user?.fullName}</h3>
              <Badge variant="success">Active Technician</Badge>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} icon={User} required />
            <Input label="Email" value={user?.email || ''} icon={Mail} disabled />
            <Input label="Contact Number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} icon={Phone} />
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} icon={MapPin} />

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Specialization</label>
              <select
                className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              >
                <option value="Starlink Internet" className="bg-slate-900">Starlink Internet</option>
                <option value="CCTV Systems" className="bg-slate-900">CCTV Systems</option>
                <option value="Smart Devices" className="bg-slate-900">Smart Devices</option>
                <option value="General Installation" className="bg-slate-900">General Installation</option>
              </select>
            </div>

            <Button type="submit" variant="primary" isLoading={loading} className="w-full">
              Update Profile
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> Security & Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="warning" isLoading={passLoading} className="w-full">
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default TechnicianProfile;
