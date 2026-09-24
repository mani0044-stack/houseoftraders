export type BrokerName = 'Angel One' | 'Zerodha' | 'Dhan' | 'Fyers';
export type ConnectionStatus = 'Connected' | 'Disconnected' | 'Connecting' | 'Error';

export interface TradingAccount {
  id: string;
  name: string;
  clientId: string; // Masked representation e.g. "ANGEL-****89"
  broker: BrokerName;
  status: ConnectionStatus;
  availableMargin: number;
  usedMargin: number;
  totalCapital: number;
  todaysPnL: number;
  openPositionsCount: number;
  assignedAlgosCount: number;
  lastHeartbeat: string;
  isEnabled: boolean;
  apiKeyConfigured: boolean;
  totpConfigured: boolean;
  pinConfigured: boolean;
}

export interface AddAccountPayload {
  name: string;
  broker: BrokerName;
  clientId: string;
  apiKey?: string;
  apiSecret?: string;
  pin?: string;
  totpSecret?: string;
}
