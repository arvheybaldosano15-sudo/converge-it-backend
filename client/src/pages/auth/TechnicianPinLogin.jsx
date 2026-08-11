import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { KeyRound, ShieldAlert, Delete, ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianPinLogin = ({ isModal = false, onClose }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { pinLogin } = useAuth();
  const navigate = useNavigate();

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setErrorMessage('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length < 4 || pin.length > 6) {
      setErrorMessage('PIN must be 4 to 6 digits');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await pinLogin(pin);
      if (onClose) onClose();
      navigate('/technician/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid PIN code';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white font-display">Technician PIN Portal</h2>
        <p className="text-xs text-blue-400 mt-1">Enter your 4–6 digit Security PIN to access dashboard</p>
      </div>

      {/* PIN Dots Display */}
      <div className="flex justify-center items-center gap-3 my-6">
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const filled = index < pin.length;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-300 border ${
                filled
                  ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/50 scale-110'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            />
          );
        })}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* On-Screen Keypad */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(String(num))}
            disabled={isLoading || pin.length >= 6}
            className="h-12 rounded-2xl glass-panel hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center border border-slate-800 hover:border-blue-500/40 transition-all active:scale-95 disabled:opacity-50"
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          disabled={isLoading || !pin}
          className="h-12 rounded-2xl glass-panel hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center border border-slate-800 transition-all active:scale-95 disabled:opacity-30"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          disabled={isLoading || pin.length >= 6}
          className="h-12 rounded-2xl glass-panel hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center border border-slate-800 hover:border-blue-500/40 transition-all active:scale-95 disabled:opacity-50"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading || !pin}
          className="h-12 rounded-2xl glass-panel hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-all active:scale-95 disabled:opacity-30"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Submit Action */}
      <Button
        type="button"
        variant="primary"
        className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
        onClick={handleSubmit}
        disabled={isLoading || pin.length < 4}
        isLoading={isLoading}
      >
        <span>Access Portal</span>
        <ArrowRight className="w-4 h-4" />
      </Button>

      {!isModal && (
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <Link
            to="/login"
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin or Password Login / Recovery</span>
          </Link>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/90 p-6 sm:p-8 max-w-sm mx-auto my-auto" glow>
      {content}
    </Card>
  );
};

export default TechnicianPinLogin;
