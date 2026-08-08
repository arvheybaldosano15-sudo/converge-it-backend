import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8 border-rose-500/30">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white font-display mb-2">403 — Access Denied</h2>
        <p className="text-sm text-slate-400 mb-6">
          You do not have permission to view this resource. Please contact your system administrator.
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </Card>
    </div>
  );
};

export default Unauthorized;
