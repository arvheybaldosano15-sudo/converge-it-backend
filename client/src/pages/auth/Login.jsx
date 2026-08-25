import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import TechnicianSignUp from './TechnicianSignUp';
import TechnicianPinLogin from './TechnicianPinLogin';
import { Mail, Lock, LogIn, Wrench, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'technician') {
        navigate('/technician/dashboard');
      }
    } catch (err) {
      if (err.message?.includes('pending')) {
        navigate('/pending-approval');
      } else {
        toast.error(err.message || 'Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/90 p-5 sm:p-8 max-w-sm sm:max-w-md w-full mx-auto my-auto" glow>
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
            Converge IT Solutions
          </h2>
          <p className="text-xs text-blue-400 font-medium mt-1">
            Customer Support & Automated Ticketing System
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5" autoComplete="off">
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="Enter your email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password field with show/hide toggle */}
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password?.message}
              className="pr-11"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-[2.05rem] z-10 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-cyan-400 active:scale-90 transition-all touch-manipulation"
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link
              to="/forgot-password"
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium ml-auto"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3.5 font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
            isLoading={isLoading}
            icon={LogIn}
          >
            Sign In
          </Button>
        </form>

        {/* Footer Info */}
        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-800/80 text-center space-y-3">
          <p className="text-xs text-slate-400 font-medium">
            Are you a field service technician?
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 sm:py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all shadow-md shadow-blue-500/10 cursor-pointer active:scale-95 touch-manipulation"
            >
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>PIN Portal Login</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 px-4 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-800 to-indigo-700 hover:from-blue-700 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30 border border-blue-400/30 active:scale-95 cursor-pointer touch-manipulation"
            >
              <Wrench className="w-4 h-4 text-blue-300" />
              <span>Technician Registration</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Technician PIN Login Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        maxWidth="max-w-sm"
      >
        <TechnicianPinLogin isModal onClose={() => setIsPinModalOpen(false)} />
      </Modal>

      {/* Technician Registration Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <TechnicianSignUp isModal onClose={() => setIsRegisterModalOpen(false)} />
      </Modal>
    </>
  );
};

export default Login;
