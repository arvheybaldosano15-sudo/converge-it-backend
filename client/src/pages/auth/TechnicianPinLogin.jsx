import React, { useState, useEffect } from 'react';
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

  const handleSubmit = async (e, customPin) => {
    if (e) e.preventDefault();
    const pinToSubmit = customPin || pin;
    if (pinToSubmit.length !== 6) {
      setErrorMessage('PIN must be exactly 6 digits');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await pinLogin(pinToSubmit);
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

  // Enable physical keyboard entry (numpad / number keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLoading) return;
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length === 6) handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLoading]);

  const content = (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-5 sm:mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 mx-auto mb-2.5">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white font-display">Technician PIN Portal</h2>
        <p className="text-xs text-blue-400 mt-1">Enter your 6-digit Security PIN to access dashboard</p>
      </div>

      {/* Hidden input for native mobile numpad support */}
      <input
        id="native-pin-input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setPin(val);
          setErrorMessage('');
          if (val.length === 6) {
            handleSubmit(null, val);
          }
        }}
        className="sr-only opacity-0 w-0 h-0 pointer-events-none"
        disabled={isLoading}
      />

      {/* PIN Dots Display — Tapping focuses native keyboard on mobile */}
      <div
        onClick={() => document.getElementById('native-pin-input')?.focus()}
        className="flex justify-center items-center gap-3 sm:gap-3.5 my-5 sm:my-6 cursor-pointer py-1"
        title="Tap to type on keyboard"
      >
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const filled = index < pin.length;
          return (
            <div
              key={index}
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full transition-all duration-200 border ${
                filled
                  ? 'bg-gradient-to-tr from-blue-600 to-cyan-400 border-blue-300 shadow-lg shadow-blue-500/60 scale-115 animate-pulse'
                  : 'bg-slate-800/80 border-slate-700/80 scale-100'
              }`}
            />
          );
        })}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* On-Screen Keypad — Mobile Touch-Optimized */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5 sm:mb-6 select-none touch-manipulation">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => {
              if (pin.length < 6) {
                const nextPin = pin + String(num);
                setPin(nextPin);
                setErrorMessage('');
                if (nextPin.length === 6) {
                  handleSubmit(null, nextPin);
                }
              }
            }}
            disabled={isLoading || pin.length >= 6}
            className="h-12 sm:h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-white font-bold text-lg sm:text-xl flex items-center justify-center border border-slate-700/60 hover:border-blue-500/50 active:scale-90 active:bg-blue-600/30 active:border-blue-400 transition-all duration-100 disabled:opacity-40 touch-manipulation cursor-pointer shadow-md shadow-black/20"
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          disabled={isLoading || !pin}
          className="h-12 sm:h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center border border-slate-800 active:scale-90 active:bg-slate-700 transition-all duration-100 disabled:opacity-30 touch-manipulation cursor-pointer"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => {
            if (pin.length < 6) {
              const nextPin = pin + '0';
              setPin(nextPin);
              setErrorMessage('');
              if (nextPin.length === 6) {
                handleSubmit(null, nextPin);
              }
            }
          }}
          disabled={isLoading || pin.length >= 6}
          className="h-12 sm:h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-white font-bold text-lg sm:text-xl flex items-center justify-center border border-slate-700/60 hover:border-blue-500/50 active:scale-90 active:bg-blue-600/30 active:border-blue-400 transition-all duration-100 disabled:opacity-40 touch-manipulation cursor-pointer shadow-md shadow-black/20"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading || !pin}
          className="h-12 sm:h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 active:scale-90 active:bg-slate-700 transition-all duration-100 disabled:opacity-30 touch-manipulation cursor-pointer"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Submit Action */}
      <Button
        type="button"
        variant="primary"
        className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/25"
        onClick={() => handleSubmit()}
        disabled={isLoading || pin.length !== 6}
        isLoading={isLoading}
      >
        <span>Access Portal</span>
        <ArrowRight className="w-4 h-4" />
      </Button>

      {!isModal && (
        <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-800 text-center">
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
    <Card className="shadow-2xl border-blue-500/20 backdrop-blur-2xl bg-slate-900/90 p-5 sm:p-8 max-w-sm w-full mx-auto my-auto" glow>
      {content}
    </Card>
  );
};

export default TechnicianPinLogin;
