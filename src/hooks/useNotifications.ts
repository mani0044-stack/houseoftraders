import { useUIStore } from '../store/useUIStore';

export function useNotifications() {
  const toasts = useUIStore((s) => s.toasts);
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);

  return { toasts, addToast, removeToast };
}
