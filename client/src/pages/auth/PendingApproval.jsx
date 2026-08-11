import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { ArrowLeft, Clock } from 'lucide-react';

const PendingApproval = () => {
  const navigate = useNavigate();

  const showAlert = () => {
    Swal.fire({
      title: 'Registration Pending Approval',
      html: `
        <div style="text-align: center; color: #cbd5e1; font-size: 0.875rem; line-height: 1.6; margin-top: 8px;">
          <p style="margin-bottom: 16px;">
            Thank you for registering! Your technician account is currently undergoing administrator review. You will receive access to the system once an administrator approves your account.
          </p>
          <div style="background: rgba(15, 23, 42, 0.8); padding: 14px; border-radius: 14px; border: 1px solid rgba(51, 65, 85, 0.8); text-align: left; font-size: 0.78rem;">
            <p style="font-weight: 700; color: #f1f5f9; margin-bottom: 6px;">Status Check Guidelines:</p>
            <p style="color: #94a3b8; margin: 4px 0;">• Contact your supervisor or administrator if approval is urgent.</p>
            <p style="color: #94a3b8; margin: 4px 0;">• Once approved, you can log in using your registered PIN or credentials.</p>
          </div>
        </div>
      `,
      icon: 'info',
      iconColor: '#f59e0b',
      background: '#0f172a',
      color: '#ffffff',
      confirmButtonText: 'Back to Login',
      confirmButtonColor: '#2563eb',
      buttonsStyling: true,
      customClass: {
        popup: 'rounded-3xl border border-blue-500/20 shadow-2xl backdrop-blur-2xl p-6',
        title: 'text-xl font-bold font-display text-white',
        confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        navigate('/login');
      }
    });
  };

  useEffect(() => {
    showAlert();
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/90 p-8 text-center max-w-md w-full space-y-6" glow>
        <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white font-display">Registration Pending Approval</h2>
          <p className="text-xs text-slate-400 mt-1">Application submitted for administrator review</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={showAlert} className="w-full">
            Show Notification Details
          </Button>
          <Button variant="secondary" onClick={() => navigate('/login')} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingApproval;
