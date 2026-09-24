import { create } from 'zustand';
import { OptionContract } from '../types/options';
import { Order } from '../types/order';
import { Position } from '../types/position';
import { TradingAccount } from '../types/account';
import { Algorithm } from '../types/algo';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modals & Drawers
  isAddAccountOpen: boolean;
  editingAccount: TradingAccount | null;
  setAddAccountOpen: (open: boolean, accountToEdit?: TradingAccount | null) => void;

  isManualOrderOpen: boolean;
  setManualOrderOpen: (open: boolean) => void;

  isEmergencyStopOpen: boolean;
  setEmergencyStopOpen: (open: boolean) => void;

  isLiveModeConfirmOpen: boolean;
  setLiveModeConfirmOpen: (open: boolean) => void;

  selectedContract: OptionContract | null;
  setSelectedContract: (contract: OptionContract | null) => void;

  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;

  selectedPosition: Position | null;
  setSelectedPosition: (position: Position | null) => void;

  selectedAccount: TradingAccount | null;
  setSelectedAccount: (account: TradingAccount | null) => void;

  selectedAlgoForLogs: Algorithm | null;
  setSelectedAlgoForLogs: (algo: Algorithm | null) => void;

  // Notification Toasts
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  isAddAccountOpen: false,
  editingAccount: null,
  setAddAccountOpen: (open, accountToEdit = null) => set({ isAddAccountOpen: open, editingAccount: accountToEdit }),

  isManualOrderOpen: false,
  setManualOrderOpen: (open) => set({ isManualOrderOpen: open }),

  isEmergencyStopOpen: false,
  setEmergencyStopOpen: (open) => set({ isEmergencyStopOpen: open }),

  isLiveModeConfirmOpen: false,
  setLiveModeConfirmOpen: (open) => set({ isLiveModeConfirmOpen: open }),

  selectedContract: null,
  setSelectedContract: (contract) => set({ selectedContract: contract }),

  selectedOrder: null,
  setSelectedOrder: (order) => set({ selectedOrder: order }),

  selectedPosition: null,
  setSelectedPosition: (position) => set({ selectedPosition: position }),

  selectedAccount: null,
  setSelectedAccount: (account) => set({ selectedAccount: account }),

  selectedAlgoForLogs: null,
  setSelectedAlgoForLogs: (algo) => set({ selectedAlgoForLogs: algo }),

  toasts: [],
  addToast: (title, message, type = 'info') => {
    const id = `toast-${Date.now()}`;
    set((state) => ({ toasts: [...state.toasts, { id, title, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
