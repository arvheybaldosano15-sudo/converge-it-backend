import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address');
    setSubmitted(true);
    toast.success('Password reset link sent to your email');
  };

  return (
    <Card className="shadow-2xl border-cyan-500/20 backdrop-blur-2xl bg-slate-900/90 p-8 max-w-md mx-auto" glow>
      <Link to="/login" className="inline-flex items-center text-xs text-slate-400 hover:text-cyan-400 transition-colors mb-4">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Back to Login
      </Link>

      <h2 className="text-xl font-bold text-white font-display mb-1">Forgot Password</h2>
      <p className="text-xs text-slate-400 mb-6">Enter your email address to receive password reset instructions.</p>

      {submitted ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-emerald-300">Check Your Email</p>
          <p className="text-xs text-slate-300">We have sent password reset instructions to {email}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="your-email@convergeit.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" className="w-full py-2.5" icon={Send}>
            Send Reset Link
          </Button>
        </form>
      )}
    </Card>
  );
};

export default ForgotPassword;
