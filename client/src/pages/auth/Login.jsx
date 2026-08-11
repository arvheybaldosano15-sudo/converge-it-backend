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
import { Mail, Lock, LogIn, Wrench, KeyRound } from 'lucide-react';
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
      <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/90 p-6 sm:p-8 max-w-md w-full mx-auto" glow>
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white font-display tracking-tight">
            Converge IT Solutions
          </h2>
          <p className="text-xs text-blue-400 font-medium mt-1">
            Customer Support & Automated Ticketing System
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="Enter your email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="Enter your password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

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
            className="w-full py-3 font-semibold text-sm"
            isLoading={isLoading}
            icon={LogIn}
          >
            Sign In
          </Button>
        </form>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Are you a field service technician?
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>PIN Portal Login</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-800 to-indigo-700 hover:from-blue-700 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30 border border-blue-400/30 active:scale-[0.98] cursor-pointer"
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
        maxWidth="max-w-xl"
      >
        <TechnicianSignUp isModal onClose={() => setIsRegisterModalOpen(false)} />
      </Modal>
    </>
  );
};

export default Login;
