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

  if (!Icon) {
    if (variant === 'success' || variant === 'primary') {
      Icon = CheckCircle;
      bgClass = bgClass || 'bg-emerald-500/20';
      textClass = textClass || 'text-emerald-400';
    } else if (variant === 'warning') {
      Icon = AlertTriangle;
      bgClass = bgClass || 'bg-amber-500/20';
      textClass = textClass || 'text-amber-400';
    } else {
      Icon = AlertTriangle;
      bgClass = bgClass || 'bg-rose-500/20';
      textClass = textClass || 'text-rose-400';
    }
  }

  bgClass = bgClass || 'bg-rose-500/20';
  textClass = textClass || 'text-rose-400';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start space-x-4">
        <div className={`p-3 ${bgClass} rounded-2xl ${textClass} shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-slate-100 font-display">{title}</h4>
          {message && <p className="text-sm text-slate-300 mt-1 leading-relaxed">{message}</p>}
          {children}
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
