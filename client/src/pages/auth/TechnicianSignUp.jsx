import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Wrench, Mail, Lock, User, Phone, BadgeCheck, ArrowLeft, KeyRound, ArrowRight, Check, ShieldCheck } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      specialization: 'Starlink Internet',
      department: 'Field Services',
    },
  });

  const nextStep = async () => {
    if (currentStep === 1) {
      const isStep1Valid = await trigger(['employeeId', 'fullName', 'email', 'contactNumber']);
      if (isStep1Valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const isStep2Valid = await trigger(['password', 'confirmPassword', 'pin', 'confirmPin']);
      if (isStep2Valid) setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

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
    <div className="w-full flex flex-col justify-between select-none">
      {/* Header & Step Indicator */}
      <div className="mb-4">
        {!isModal && (
          <Link to="/login" className="inline-flex items-center text-xs text-slate-400 hover:text-blue-400 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Login
          </Link>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white font-display">Technician Registration</h2>
            <p className="text-xs text-blue-400 mt-0.5">Join Converge IT Solutions Field Support Team</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Step {currentStep} of 3
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Step Badges */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[10px] sm:text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => currentStep > 1 && setCurrentStep(1)}
            className={`py-1 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
              currentStep === 1 ? 'text-blue-400 bg-blue-500/10 font-bold' : currentStep > 1 ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {currentStep > 1 ? <Check className="w-3 h-3" /> : '1.'} Info
          </button>
          <button
            type="button"
            onClick={() => currentStep > 2 && setCurrentStep(2)}
            className={`py-1 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
              currentStep === 2 ? 'text-blue-400 bg-blue-500/10 font-bold' : currentStep > 2 ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {currentStep > 2 ? <Check className="w-3 h-3" /> : '2.'} Security
          </button>
          <button
            type="button"
            disabled
            className={`py-1 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
              currentStep === 3 ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-500'
            }`}
          >
            3. Role
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: Personal & Contact Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Employee ID"
                  icon={BadgeCheck}
                  placeholder="TECH-001"
                  autoCapitalize="characters"
                  error={errors.employeeId?.message}
                  {...register('employeeId')}
                />
                <Input
                  label="Full Name"
                  icon={User}
                  placeholder="Juan Dela Cruz"
                  autoCapitalize="words"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  placeholder="tech@convergeit.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Contact Number"
                  icon={Phone}
                  placeholder="09171234567"
                  inputMode="numeric"
                  type="tel"
                  error={errors.contactNumber?.message}
                  {...register('contactNumber')}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 2: Password & PIN */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="4-6 Digit Portal PIN"
                  type="password"
                  icon={KeyRound}
                  placeholder="••••"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                  pattern="[0-9]*"
                  error={errors.confirmPin?.message}
                  {...register('confirmPin')}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Specialization & Department */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Specialization</label>
                  <select
                    className="glass-input w-full rounded-xl py-3 px-3 text-base sm:text-sm text-slate-200"
                    {...register('specialization')}
                  >
                    <option value="Starlink Internet" className="bg-slate-900 text-slate-200">Starlink Internet</option>
                    <option value="CCTV Systems" className="bg-slate-900 text-slate-200">CCTV Systems</option>
                    <option value="Smart Devices" className="bg-slate-900 text-slate-200">Smart Devices</option>
                    <option value="General Installation" className="bg-slate-900 text-slate-200">General Installation</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Department</label>
                  <select
                    className="glass-input w-full rounded-xl py-3 px-3 text-base sm:text-sm text-slate-200"
                    {...register('department')}
                  >
                    <option value="Field Services" className="bg-slate-900 text-slate-200">Field Services</option>
                    <option value="Technical Support" className="bg-slate-900 text-slate-200">Technical Support</option>
                    <option value="Network Infrastructure" className="bg-slate-900 text-slate-200">Network Infrastructure</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Your application will be sent for administrator approval upon submission.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Controls */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="ml-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-blue-600/25"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3.5 text-xs sm:text-sm font-bold active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
              isLoading={isLoading}
            >
              Submit Application
            </Button>
          )}
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return content;
  }

  // Standalone route (/register-technician) wrapped in a full modal overlay for zero scrolling!
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden">
      <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/95 p-5 sm:p-7 max-w-md w-full mx-auto" glow>
        {content}
      </Card>
    </div>
  );
};

export default TechnicianSignUp;
