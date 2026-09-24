import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  confirmVariant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  }[confirmVariant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-scale">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'p-3 rounded-2xl shrink-0 border',
              confirmVariant === 'danger' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
            )}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2',
              variantStyles,
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
