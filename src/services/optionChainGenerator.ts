import { UnderlyingSymbol } from '../types/algo';
import { OptionChainRow, OptionContract } from '../types/options';

export function generateMockOptionChain(
  underlying: UnderlyingSymbol = 'NIFTY',
  spotPrice: number = 24865.40,
  expiry: string = '26 SEP 2024'
): OptionChainRow[] {
  const step = underlying === 'BANKNIFTY' ? 100 : underlying === 'FINNIFTY' ? 50 : 50;
  const atmStrike = Math.round(spotPrice / step) * step;
  
  const rows: OptionChainRow[] = [];
  const strikeCount = 15; // 15 strikes above and below ATM
  
  for (let i = -strikeCount; i <= strikeCount; i++) {
    const strike = atmStrike + i * step;
    const isATM = strike === atmStrike;
    
    // Calculate realistic intrinsic & extrinsic value approximation
    const ceMoneyness = spotPrice - strike;
    const peMoneyness = strike - spotPrice;
    
    const ceLtp = Math.max(5, Math.round((Math.max(0, ceMoneyness) + Math.max(15, 180 - Math.abs(i) * 12)) * 100) / 100);
    const peLtp = Math.max(5, Math.round((Math.max(0, peMoneyness) + Math.max(15, 180 - Math.abs(i) * 12)) * 100) / 100);
    
    const ceOI = Math.round(Math.max(500, 45000 - Math.abs(i) * 2200 + Math.sin(i) * 5000));
    const peOI = Math.round(Math.max(500, 48000 - Math.abs(i) * 2100 + Math.cos(i) * 5000));
    
    const ceChangeOI = Math.round((Math.random() - 0.45) * 3500);
    const peChangeOI = Math.round((Math.random() - 0.45) * 3800);
    
    // Greeks approximation
    const deltaCE = Math.min(0.99, Math.max(0.01, 0.5 + (i * -0.03)));
    const deltaPE = Math.min(-0.01, Math.max(-0.99, -0.5 + (i * -0.03)));
    
    const ceContract: OptionContract = {
      symbol: `${underlying}24SEP${strike}CE`,
      underlying,
      strike,
      expiry,
      type: 'CE',
      ltp: ceLtp,
      change: Math.round((ceLtp * (Math.random() * 0.08 - 0.03)) * 100) / 100,
      changePercent: Math.round((Math.random() * 6 - 2) * 100) / 100,
      bidPrice: Math.round((ceLtp - 0.5) * 100) / 100,
      bidQty: Math.round(Math.random() * 500 + 50) * 25,
      askPrice: Math.round((ceLtp + 0.5) * 100) / 100,
      askQty: Math.round(Math.random() * 500 + 50) * 25,
      volume: Math.round(ceOI * 0.4),
      openInterest: ceOI,
      changeOI: ceChangeOI,
      greeks: {
        delta: Math.round(deltaCE * 100) / 100,
        gamma: Math.round((0.005 - Math.abs(i) * 0.0003) * 1000) / 1000,
        theta: Math.round((-12 - Math.random() * 4) * 100) / 100,
        vega: Math.round((8.5 + Math.random() * 2) * 100) / 100,
        iv: Math.round((14.5 + (Math.abs(i) * 0.3)) * 100) / 100,
      },
      isATM
    };

    const peContract: OptionContract = {
      symbol: `${underlying}24SEP${strike}PE`,
      underlying,
      strike,
      expiry,
      type: 'PE',
      ltp: peLtp,
      change: Math.round((peLtp * (Math.random() * 0.08 - 0.03)) * 100) / 100,
      changePercent: Math.round((Math.random() * 6 - 2) * 100) / 100,
      bidPrice: Math.round((peLtp - 0.5) * 100) / 100,
      bidQty: Math.round(Math.random() * 500 + 50) * 25,
      askPrice: Math.round((peLtp + 0.5) * 100) / 100,
      askQty: Math.round(Math.random() * 500 + 50) * 25,
      volume: Math.round(peOI * 0.4),
      openInterest: peOI,
      changeOI: peChangeOI,
      greeks: {
        delta: Math.round(deltaPE * 100) / 100,
        gamma: Math.round((0.005 - Math.abs(i) * 0.0003) * 1000) / 1000,
        theta: Math.round((-12 - Math.random() * 4) * 100) / 100,
        vega: Math.round((8.5 + Math.random() * 2) * 100) / 100,
        iv: Math.round((14.5 + (Math.abs(i) * 0.3)) * 100) / 100,
      },
      isATM
    };

    rows.push({
      strike,
      isATM,
      ce: ceContract,
      pe: peContract
    });
  }

  return rows;
}
