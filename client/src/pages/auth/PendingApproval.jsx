import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Clock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PendingApproval = () => {
  return (
    <Card className="shadow-2xl border-cyan-500/20 backdrop-blur-2xl bg-slate-900/90 p-8 text-center max-w-md mx-auto" glow>
      <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
        <Clock className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-white font-display mb-2">Registration Pending Approval</h2>
      <p className="text-sm text-slate-300 mb-6 leading-relaxed">
        Thank you for registering! Your technician account is currently undergoing administrator review.
        You will receive access to the system once an administrator approves your account.
      </p>

      <div className="bg-slate-800/60 rounded-xl p-4 mb-6 border border-slate-700/60 text-xs text-slate-400 text-left space-y-1">
        <p className="font-semibold text-slate-300">Status Check Guidelines:</p>
        <p>• Contact your supervisor or administrator if approval is urgent.</p>
        <p>• Once approved, you can log in using your registered email & password.</p>
      </div>

      <Link to="/login">
        <Button variant="secondary" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
      </Link>
    </Card>
  );
};

export default PendingApproval;
