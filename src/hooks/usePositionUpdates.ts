import { useTradingStore } from '../store/useTradingStore';

export function usePositionUpdates() {
  const positions = useTradingStore((s) => s.positions);
  const exitPosition = useTradingStore((s) => s.exitPosition);
  const exitAllPositions = useTradingStore((s) => s.exitAllPositions);

  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const totalUnrealizedPnL = openPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0);

  return { positions, openPositions, totalUnrealizedPnL, exitPosition, exitAllPositions };
}
