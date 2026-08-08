import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, Lock, LogIn, Wrench, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@convergeit.com',
      password: 'Admin@Converge2024!',
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
    <Card className="shadow-2xl border-cyan-500/20 backdrop-blur-2xl bg-slate-900/90 p-8" glow>
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-cyan-500/30 mb-3 animate-float">
          C
        </div>
        <h2 className="text-2xl font-extrabold text-white font-display tracking-tight">
          Converge IT Solutions
        </h2>
        <p className="text-xs text-cyan-400 font-medium mt-1">
          Customer Support & Automated Ticketing System
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="admin@convergeit.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between text-xs">
          <Link
            to="/forgot-password"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium ml-auto"
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
        <Link
          to="/register-technician"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <Wrench className="w-4 h-4" />
          <span>Register as Technician</span>
        </Link>
      </div>
    </Card>
  );
};

export default Login;
