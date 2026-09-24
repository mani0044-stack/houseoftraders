import { useTradingStore } from '../store/useTradingStore';

export function useOrderUpdates() {
  const orders = useTradingStore((s) => s.orders);
  return { orders };
}
