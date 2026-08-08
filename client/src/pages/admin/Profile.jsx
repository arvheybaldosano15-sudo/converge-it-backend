import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { User, Mail, Phone, MapPin, Shield, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', { fullName, contactNumber, address });
      if (res.success) {
        updateUserProfile(res.data);
        toast.success('Profile updated successfully');
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
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">User Profile & Account</h1>
        <p className="text-xs text-slate-400">Manage your personal credentials and security preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Info */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" /> General Information
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} icon={User} required />
            <Input label="Email (Read-only)" value={user?.email || ''} icon={Mail} disabled />
            <Input label="Contact Number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} icon={Phone} />
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} icon={MapPin} />

            <Button type="submit" variant="primary" isLoading={loading} className="w-full">
              Save Profile Changes
            </Button>
          </form>
        </Card>

        {/* Change Password */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> Change Security Password
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

export default Profile;
