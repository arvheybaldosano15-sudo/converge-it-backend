import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Wrench, Mail, Lock, User, Phone, BadgeCheck, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  employeeId: z.string().min(3, 'Employee ID is required (e.g. TECH-101)'),
  fullName: z.string().min(2, 'Full Name is required'),
  email: z.string().email('Valid email address is required'),
  contactNumber: z.string().min(10, 'Contact number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
  confirmPin: z.string().min(4, 'Please confirm your PIN'),
  specialization: z.string().optional(),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ['confirmPin'],
});

const TechnicianSignUp = ({ isModal = false, onClose }) => {
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
      if (onClose) onClose();
      navigate('/pending-approval');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div>
      {/* Header */}
      <div className="mb-6">
        {!isModal && (
          <Link to="/login" className="inline-flex items-center text-xs text-slate-400 hover:text-blue-400 transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Login
          </Link>
        )}
        <div>
          <h2 className="text-xl font-extrabold text-white font-display">Technician Registration</h2>
          <p className="text-xs text-blue-400">Join Converge IT Solutions Field Support Team</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="4-6 Digit Portal PIN"
            type="password"
            icon={KeyRound}
            placeholder="••••"
            maxLength={6}
            inputMode="numeric"
            error={errors.pin?.message}
            {...register('pin')}
          />
          <Input
            label="Confirm PIN"
            type="password"
            icon={KeyRound}
            placeholder="••••"
            maxLength={6}
            inputMode="numeric"
            error={errors.confirmPin?.message}
            {...register('confirmPin')}
          />
        </div>

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
    </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/90 p-5 sm:p-8 max-w-lg w-full mx-auto" glow>
      {content}
    </Card>
  );
};

export default TechnicianSignUp;
