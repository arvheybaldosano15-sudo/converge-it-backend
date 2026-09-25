import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger',
  icon: CustomIcon,
  iconColor,
  iconBg,
  children,
}) => {
  let Icon = CustomIcon;
  let bgClass = iconBg;
  let textClass = iconColor;
  let ringClass = 'ring-rose-500/20';

  if (!Icon) {
    if (variant === 'success' || variant === 'primary') {
      Icon = CheckCircle;
      bgClass = bgClass || 'bg-emerald-500/20';
      textClass = textClass || 'text-emerald-400';
      ringClass = 'ring-emerald-500/20';
    } else if (variant === 'warning') {
      Icon = AlertTriangle;
      bgClass = bgClass || 'bg-amber-500/20';
      textClass = textClass || 'text-amber-400';
      ringClass = 'ring-amber-500/20';
    } else {
      Icon = AlertTriangle;
      bgClass = bgClass || 'bg-rose-500/20';
      textClass = textClass || 'text-rose-400';
      ringClass = 'ring-rose-500/20';
    }
  } else {
    bgClass = bgClass || 'bg-slate-800/80';
    textClass = textClass || 'text-cyan-400';
    ringClass = 'ring-slate-700/30';
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start space-x-3.5">
          <div className={`p-3.5 ${bgClass} rounded-2xl ${textClass} shrink-0 ring-4 ${ringClass} shadow-lg backdrop-blur-md`}>
            <Icon className="w-6 h-6 animate-in zoom-in-75 duration-200" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-lg font-bold text-slate-100 font-display tracking-tight leading-snug">
              {title}
            </h4>
            {message && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed font-normal">
                {message}
              </p>
            )}
          </div>
        </div>

        {children && <div className="pt-1">{children}</div>}

        <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
            className="px-5 py-2 text-xs font-bold shadow-lg active:scale-95 transition-all"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
