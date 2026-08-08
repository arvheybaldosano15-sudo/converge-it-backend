import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white font-display mb-2">404</h2>
        <p className="text-sm font-semibold text-cyan-400 mb-1">Page Not Found</p>
        <p className="text-xs text-slate-400 mb-6">The page you are looking for does not exist or has been moved.</p>
        <Button variant="primary" onClick={() => navigate('/')} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default NotFound;
