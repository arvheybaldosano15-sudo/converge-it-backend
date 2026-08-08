import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Wrench, Mail, Lock, User, Phone, MapPin, BadgeCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  employeeId: z.string().min(3, 'Employee ID is required (e.g. TECH-101)'),
  fullName: z.string().min(2, 'Full Name is required'),
  email: z.string().email('Valid email address is required'),
  contactNumber: z.string().min(10, 'Contact number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  address: z.string().optional(),
  specialization: z.string().optional(),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const TechnicianSignUp = () => {
  const { registerTechnician } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await registerTechnician(data);
      navigate('/pending-approval');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl border-cyan-500/20 backdrop-blur-2xl bg-slate-900/90 p-8 max-w-lg mx-auto" glow>
      {/* Header */}
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center text-xs text-slate-400 hover:text-cyan-400 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Login
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white font-display">Technician Registration</h2>
            <p className="text-xs text-cyan-400">Join Converge IT Solutions Field Support Team</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            icon={BadgeCheck}
            placeholder="TECH-001"
            error={errors.employeeId?.message}
            {...register('employeeId')}
          />
          <Input
            label="Full Name"
            icon={User}
            placeholder="Juan Dela Cruz"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="tech@convergeit.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contact Number"
            icon={Phone}
            placeholder="09171234567"
            error={errors.contactNumber?.message}
            {...register('contactNumber')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Input
          label="Address"
          icon={MapPin}
          placeholder="Barangay, City, Province"
          error={errors.address?.message}
          {...register('address')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Specialization</label>
            <select
              className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
              {...register('specialization')}
            >
              <option value="Starlink Internet" className="bg-slate-900">Starlink Internet</option>
              <option value="CCTV Systems" className="bg-slate-900">CCTV Systems</option>
              <option value="Smart Devices" className="bg-slate-900">Smart Devices</option>
              <option value="General Installation" className="bg-slate-900">General Installation</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Department</label>
            <select
              className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
              {...register('department')}
            >
              <option value="Field Services" className="bg-slate-900">Field Services</option>
              <option value="Technical Support" className="bg-slate-900">Technical Support</option>
              <option value="Network Infrastructure" className="bg-slate-900">Network Infrastructure</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 font-semibold text-sm"
            isLoading={isLoading}
          >
            Submit Application for Approval
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TechnicianSignUp;
