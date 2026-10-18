import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { ShieldAlert, ArrowRight, LogOut, Home, Wrench, Shield, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clearAuthSession } from '../../utils/authStorage';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSwitchAccount = async () => {
    try {
      await logout();
    } catch (_) {
      clearAuthSession('all');
    } finally {
      navigate('/login');
    }
  };

  const displayName = user?.fullName || user?.full_name || user?.name || user?.email;
  const isTech = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950/80">
      <Card className="max-w-md w-full text-center p-8 border-rose-500/30 shadow-2xl shadow-rose-950/30">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-white font-display mb-1">403 — Access Denied</h2>
        <p className="text-xs text-rose-400/90 font-semibold uppercase tracking-wider mb-5">
          Permission Restricted
        </p>

        {/* Current User Identity Box */}
        {user ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 mb-5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-cyan-400/30">
              {displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <Badge variant={isTech ? 'cyan' : isAdmin ? 'purple' : 'warning'}>
                  {user.role?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email || 'Active Session'}</p>
            </div>
          </div>
        ) : null}

        {/* Dynamic Context Message */}
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {isTech ? (
            <>
              You are signed in as a <span className="font-semibold text-cyan-400">Field Technician</span>. 
              This section is reserved for Administrators. Please proceed to the Technician Portal.
            </>
          ) : isAdmin ? (
            <>
              You are signed in as an <span className="font-semibold text-purple-400">Administrator</span>. 
              This section is reserved for Field Technicians.
            </>
          ) : (
            'You do not have permission to view this resource. Please sign in with an authorized account or return to your dashboard.'
          )}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Primary Action Button */}
          {isTech && (
            <Button
              variant="primary"
              onClick={() => navigate('/technician/dashboard')}
              className="w-full justify-center"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Go to Technician Portal
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="primary"
              onClick={() => navigate('/admin/dashboard')}
              className="w-full justify-center"
            >
              <Shield className="w-4 h-4 mr-2" />
              Go to Admin Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {!user && (
            <Button
              variant="primary"
              onClick={() => navigate('/login')}
              className="w-full justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Your Account
            </Button>
          )}

          {/* Switch Account / Sign Out */}
          {user ? (
            <Button
              variant="secondary"
              onClick={handleSwitchAccount}
              className="w-full justify-center text-slate-300 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2 text-rose-400" />
              Sign In with Different Account
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => navigate('/technician-login')}
              className="w-full justify-center"
            >
              <Wrench className="w-4 h-4 mr-2 text-cyan-400" />
              Technician PIN Sign In
            </Button>
          )}

          {/* Return to Home */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full justify-center text-slate-400 hover:text-slate-200 text-xs"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            Return to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Unauthorized;
