import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

type ToastContainerProps = {
  toasts: Toast[];
  onRemove: (id: string) => void;
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="pointer-events-auto"
          >
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : toast.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : toast.type === 'loading'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 size={18} className="flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={18} className="flex-shrink-0" />}
              {toast.type === 'loading' && (
                <Loader2 size={18} className="flex-shrink-0 animate-spin" />
              )}
              {toast.type === 'info' && <Info size={18} className="flex-shrink-0" />}

              <p className="text-sm font-medium">{toast.message}</p>

              {toast.type !== 'loading' && (
                <button
                  onClick={() => onRemove(toast.id)}
                  className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
