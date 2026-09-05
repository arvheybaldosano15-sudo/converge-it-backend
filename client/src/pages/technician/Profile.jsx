import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Wrench,
  Shield,
  Key,
  Camera,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Lock,
  Building,
  Bell
} from 'lucide-react';
import toast from 'react-hot-toast';
import { initPushNotifications, testLocalNotification } from '../../utils/pushNotifications';

const TechnicianProfile = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [specialization, setSpecialization] = useState('Field Services');
  const [department, setDepartment] = useState('Field Operations');
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passErrors, setPassErrors] = useState({});

  // Sync state when user context loads/changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.full_name || '');
      setContactNumber(user.contactNumber || user.contact_number || '');
      setAddress(user.address || '');
      setSpecialization(user.specialization || 'Starlink Internet');
      setDepartment(user.department || 'Field Operations');
      setPreviewImage(user.profileImageUrl || user.profile_image_url || null);
    }
  }, [user]);

  // Reset unsaved profile changes
  const handleResetProfile = () => {
    if (user) {
      setFullName(user.fullName || user.full_name || '');
      setContactNumber(user.contactNumber || user.contact_number || '');
      setAddress(user.address || '');
      setSpecialization(user.specialization || 'Starlink Internet');
      setDepartment(user.department || 'Field Operations');
      setProfileImage(null);
      setPreviewImage(user.profileImageUrl || user.profile_image_url || null);
      setProfileErrors({});
      toast.success('Form reset to saved profile');
    }
  };

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Profile image must be less than 5MB');
        return;
      }
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // Validate Profile Fields
  const validateProfile = () => {
    const errs = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full Name is required';
    }
    if (contactNumber && !/^[0-9+()\s-]{7,15}$/.test(contactNumber.trim())) {
      errs.contactNumber = 'Enter a valid contact number (7-15 digits)';
    }
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Profile Updates
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('contactNumber', contactNumber);
      formData.append('address', address);
      formData.append('specialization', specialization);
      formData.append('department', department);
      if (profileImage) {
        formData.append('profile_image', profileImage);
      }

      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success && res.data) {
        updateUserProfile(res.data);
        toast.success('Technician profile updated successfully!');
        setProfileImage(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update technician profile');
    } finally {
      setLoading(false);
    }
  };

  // Validate Password Fields
  const validatePassword = () => {
    const errs = {};
    if (!currentPassword) {
      errs.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      errs.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters long';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'New passwords do not match';
    }
    setPassErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setPassLoading(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPassErrors({});
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update password. Verify your current password.');
    } finally {
      setPassLoading(false);
    }
  };

  // User Display Name & Initials
  const displayName = fullName || user?.fullName || 'Technician';
  const displayEmail = user?.email || 'N/A';
  const displayEmployeeId = user?.employeeId || user?.employee_id || 'N/A';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Employee Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Technician Profile</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Employee ID: <span className="font-mono text-cyan-400 font-bold">{displayEmployeeId}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT COLUMN: PERSONAL PROFILE & WORK DETAILS ── */}
        <Card className="space-y-5">
          {/* Avatar Header Box */}
          <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md border-2 border-cyan-500/50">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <Camera className="w-5 h-5 text-cyan-300" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-display">{displayName}</h3>
              <p className="text-xs text-slate-400">{displayEmail}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="success" className="flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Active Technician
                </Badge>
              </div>
            </div>
          </div>

          {/* Real Mobile Lock-Screen Push Alert Control */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Real Mobile Lock-Screen Push</span>
              </div>
              <Badge variant="info">Enabled</Badge>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Receive instant lock-screen push notifications on your real mobile phone whenever a ticket is assigned to you.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const result = await initPushNotifications();
                if (result.success) {
                  await testLocalNotification();
                  toast.success('Mobile push notification sent to your phone!');
                } else if (result.reason === 'denied') {
                  toast.error('Notifications OFF in Android Settings. Please switch ON "All MTS-Converge notifications" in phone settings!');
                } else {
                  toast.error('Unable to initialize push on this device.');
                }
              }}
              icon={Bell}
              className="w-full text-xs"
            >
              Test Phone Lock-Screen Push
            </Button>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Full Name */}
            <div>
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={User}
                required
                placeholder="Enter your full name"
              />
              {profileErrors.fullName && (
                <p className="text-[11px] text-rose-400 mt-1">{profileErrors.fullName}</p>
              )}
            </div>

            {/* Read-Only: Account Email */}
            <div>
              <Input
                label="Account Email (Read-Only)"
                value={displayEmail}
                icon={Mail}
                disabled
                className="opacity-75 cursor-not-allowed bg-slate-950/80"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Account email is locked by administrator permissions
              </span>
            </div>

            {/* Contact Number */}
            <div>
              <Input
                label="Contact Number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                icon={Phone}
                placeholder="e.g. 0917-123-4567"
              />
              {profileErrors.contactNumber && (
                <p className="text-[11px] text-rose-400 mt-1">{profileErrors.contactNumber}</p>
              )}
            </div>

            {/* Field Address */}
            <Input
              label="Field / Home Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              icon={MapPin}
              placeholder="Enter your complete address"
            />

            {/* Specialization Dropdown */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Technical Specialization
              </label>
              <select
                className="glass-input w-full rounded-xl py-2.5 px-3 text-xs bg-slate-900 text-white border border-slate-700/80"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              >
                <option value="Starlink Internet" className="bg-slate-900">Starlink Satellite Installation</option>
                <option value="CCTV & Security Systems" className="bg-slate-900">CCTV & Surveillance Systems</option>
                <option value="Smart Devices & IoT" className="bg-slate-900">Smart Home & IoT Devices</option>
                <option value="Fiber & Network Infrastructure" className="bg-slate-900">Fiber & Network Infrastructure</option>
                <option value="General Field Service" className="bg-slate-900">General Field Service</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" isLoading={loading} className="flex-1">
                Update Profile
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetProfile}
                icon={RotateCcw}
                title="Discard unsaved changes"
              >
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {/* ── RIGHT COLUMN: SECURITY & PASSWORD ── */}
        <Card className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-cyan-400" /> Security & Password
            </h3>
            <Badge variant="cyan" className="text-[10px]">
              Bcrypt Encrypted
            </Badge>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  icon={Shield}
                  required
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passErrors.currentPassword && (
                <p className="text-[11px] text-rose-400 mt-1">{passErrors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <div className="relative">
                <Input
                  label="New Password"
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={Key}
                  required
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passErrors.newPassword && (
                <p className="text-[11px] text-rose-400 mt-1">{passErrors.newPassword}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={Key}
                  required
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passErrors.confirmPassword && (
                <p className="text-[11px] text-rose-400 mt-1">{passErrors.confirmPassword}</p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-bold text-slate-200 block">Password Guidelines:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Minimum of 6 characters long</li>
                <li>Must differ from your current password</li>
                <li>Protected using secure 12-round bcrypt hash</li>
              </ul>
            </div>

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
