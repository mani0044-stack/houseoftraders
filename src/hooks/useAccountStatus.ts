import { useTradingStore } from '../store/useTradingStore';

export function useAccountStatus() {
  const accounts = useTradingStore((s) => s.accounts);
  const selectedAccountId = useTradingStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useTradingStore((s) => s.setSelectedAccountId);
  const toggleAccountStatus = useTradingStore((s) => s.toggleAccountStatus);

  const activeAccounts = accounts.filter((a) => a.isEnabled);

  return {
    accounts,
    activeAccounts,
    selectedAccountId,
    setSelectedAccountId,
    toggleAccountStatus
  };
}
