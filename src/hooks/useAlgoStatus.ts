import { useTradingStore } from '../store/useTradingStore';

export function useAlgoStatus() {
  const algos = useTradingStore((s) => s.algos);
  const updateAlgoStatus = useTradingStore((s) => s.updateAlgoStatus);
  const activeAlgosCount = algos.filter((a) => a.status === 'Active').length;

  return { algos, activeAlgosCount, updateAlgoStatus };
}
