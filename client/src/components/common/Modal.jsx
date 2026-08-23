import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Hardware-accelerated lightweight mobile animation variants
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          {/* Backdrop — Solid dark slate on mobile for instant 60fps opening */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/90 sm:backdrop-blur-md"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, y: isMobile ? 50 : 20, scale: isMobile ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 50 : 20, scale: isMobile ? 1 : 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} glass-panel bg-slate-900/95 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-blue-500/20 z-10 my-0 sm:my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden transform-gpu`}
          >
            {/* Mobile Grab Bar */}
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Top Right Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 pr-12 shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-display truncate">{title}</h3>
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6 pb-8 sm:pb-6 overflow-y-auto custom-scrollbar flex-1 touch-pan-y">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
