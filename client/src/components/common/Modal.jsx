import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl', noBackdrop = false, showCloseButton = true }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showCloseButton) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showCloseButton]);

  // Hardware-accelerated lightweight mobile animation variants
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Semi-transparent Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={showCloseButton ? onClose : undefined}
            className={`fixed inset-0 ${noBackdrop ? 'bg-slate-950/45 backdrop-blur-sm' : 'bg-slate-950/75 sm:backdrop-blur-md'}`}
          />

          {/* Modal Box — Centered & Viewport-Optimized for Mobile Phones & PWA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative w-full ${maxWidth} glass-panel bg-slate-900/98 sm:bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-700/80 z-10 my-auto max-h-[88dvh] sm:max-h-[90vh] flex flex-col overflow-hidden transform-gpu`}
          >
            {/* Top Right Close Button */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white active:scale-95 transition-all touch-manipulation cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 pr-12 shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-display truncate">{title}</h3>
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6 pb-6 overflow-y-auto custom-scrollbar flex-1 touch-pan-y">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
