import { create } from 'zustand';
import { TradingAccount, AddAccountPayload, ConnectionStatus } from '../types/account';
import { Algorithm, AlgoStatus } from '../types/algo';
import { MarketQuote } from '../types/market';
import { Order } from '../types/order';
import { Position } from '../types/position';
import { RiskLimit } from '../types/risk';
import { ActivityLogItem, SeverityLevel, ActivityCategory } from '../types/activity';
import { TradingMode } from '../types/algo';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_ALGOS, 
  INITIAL_MARKET_QUOTES, 
  INITIAL_POSITIONS, 
  INITIAL_ORDERS, 
  INITIAL_RISK_LIMIT, 
  INITIAL_ACTIVITY_LOGS 
} from '../services/mockData';
import { accountsApi } from '../api/accountsApi';
import { ordersApi, CreateOrderRequest } from '../api/ordersApi';
import { positionsApi } from '../api/positionsApi';
import { marketApi } from '../api/marketApi';

interface TradingState {
  // Mode & Selection
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => void;
  selectedAccountId: string; // 'ALL' or specific account id
  setSelectedAccountId: (id: string) => void;
  
  // Data State
  accounts: TradingAccount[];
  algos: Algorithm[];
  marketQuotes: Record<string, MarketQuote>;
  positions: Position[];
  orders: Order[];
  riskLimit: RiskLimit;
  activityLogs: ActivityLogItem[];
  wsConnected: boolean;
  wsLatencyMs: number;
  backendConnected: boolean;
  isLoadingData: boolean;

  // Actions
  fetchAccounts: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchMarketQuotes: () => Promise<void>;
  syncAccountMargin: (accountId: string) => Promise<void>;
  testConnection: (accountId: string) => Promise<{ success: boolean; message: string; availableMargin?: number }>;
  toggleAccountStatus: (accountId: string) => void;
  addAccount: (payload: AddAccountPayload) => Promise<TradingAccount>;
  updateAccountCredentials: (accountId: string, payload: AddAccountPayload) => Promise<TradingAccount>;
  deleteAccount: (accountId: string) => Promise<void>;
  updateAlgoStatus: (algoId: string, status: AlgoStatus) => void;
  addAlgorithm: (algo: Algorithm) => void;
  updateAlgorithm: (algo: Algorithm) => void;
  deleteAlgorithm: (algoId: string) => void;
  placeOrder: (payload: CreateOrderRequest) => Promise<any>;
  exitPosition: (positionId: string) => Promise<void>;
  exitAllPositions: () => Promise<void>;
  emergencyStopAll: () => void;
  updateMarketQuote: (symbol: string, ltpDelta: number) => void;
  setWsStatus: (connected: boolean, latency?: number) => void;
  addActivityLog: (title: string, message: string, category: ActivityCategory, severity: SeverityLevel) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  tradingMode: 'Live',
  setTradingMode: (mode) => set({ tradingMode: mode }),
  selectedAccountId: 'ALL',
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),

  accounts: INITIAL_ACCOUNTS,
  algos: INITIAL_ALGOS,
  marketQuotes: INITIAL_MARKET_QUOTES,
  positions: INITIAL_POSITIONS,
  orders: INITIAL_ORDERS,
  riskLimit: INITIAL_RISK_LIMIT,
  activityLogs: INITIAL_ACTIVITY_LOGS,
  wsConnected: true,
  wsLatencyMs: 14,
  backendConnected: true,
  isLoadingData: false,

  fetchAccounts: async () => {
    try {
      const data = await accountsApi.getAccounts();
      set({ accounts: data, backendConnected: true });
    } catch {
      set({ backendConnected: false });
    }
  },

  fetchPositions: async () => {
    try {
      const data = await positionsApi.getPositions();
      set({ positions: data });
    } catch (err) {
      console.error("Failed fetching positions:", err);
    }
  },

  fetchOrders: async () => {
    try {
      const data = await ordersApi.getOrders();
      set({ orders: data });
    } catch (err) {
      console.error("Failed fetching orders:", err);
    }
  },

  fetchMarketQuotes: async () => {
    try {
      const quotes = await marketApi.getQuotes();
      if (quotes && Object.keys(quotes).length > 0) {
        set({ marketQuotes: quotes });
      }
    } catch {
      // fallback
    }
  },

  syncAccountMargin: async (accountId: string) => {
    try {
      const updated = await accountsApi.syncAccountMargin(accountId);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, ...updated } : a))
      }));
      get().addActivityLog(
        'Margin Synced',
        `Live available margin for ${updated.name || accountId} updated to ₹${updated.availableMargin.toLocaleString()}.`,
        'Account',
        'SUCCESS'
      );
    } catch (err: any) {
      get().addActivityLog(
        'Margin Sync Failed',
        err?.response?.data?.detail || `Failed syncing margin for ${accountId}`,
        'Account',
        'ERROR'
      );
    }
  },

  testConnection: async (accountId: string) => {
    try {
      const res = await accountsApi.testConnection(accountId);
      if (res.success) {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId
              ? { ...a, status: 'Connected', availableMargin: res.availableMargin ?? a.availableMargin }
              : a
          )
        }));
        get().addActivityLog(
          'Connection Test Successful',
          `Angel One SmartAPI Session Connected for ${accountId}.`,
          'Account',
          'SUCCESS'
        );
      } else {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, status: 'Authentication_Required' as ConnectionStatus } : a
          )
        }));
        get().addActivityLog(
          'Connection Test Failed',
          res.message || `Authentication required for account ${accountId}`,
          'Account',
          'ERROR'
        );
      }
      return res;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || 'Connection test failed';
      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === accountId ? { ...a, status: 'Authentication_Required' as ConnectionStatus } : a
        )
      }));
      get().addActivityLog(
        'Connection Error',
        errorMsg,
        'Account',
        'ERROR'
      );
      return { success: false, message: errorMsg };
    }
  },

  toggleAccountStatus: (accountId) => {
    set((state) => {
      const updated = state.accounts.map((acc) => {
        if (acc.id === accountId) {
          const nextState = !acc.isEnabled;
          accountsApi.updateAccountStatus(accountId, nextState);
          get().addActivityLog(
            `Account ${nextState ? 'Enabled' : 'Disabled'}`,
            `Trading account ${acc.name} (${acc.clientId}) is now ${nextState ? 'Active' : 'Disabled'}.`,
            'Account',
            nextState ? 'SUCCESS' : 'WARNING'
          );
          return { ...acc, isEnabled: nextState, status: (nextState ? 'Connected' : 'Disconnected') as ConnectionStatus };
        }
        return acc;
      });
      return { accounts: updated };
    });
  },

  addAccount: async (payload) => {
    const createdAcc = await accountsApi.addAccount(payload);
    set((state) => ({ accounts: [...state.accounts, createdAcc] }));
    get().addActivityLog(
      'New Account Added',
      `Trading account ${createdAcc.name} (${createdAcc.clientId}) added. Status: ${createdAcc.status}.`,
      'Account',
      createdAcc.status === 'Connected' ? 'SUCCESS' : 'WARNING'
    );
    return createdAcc;
  },

  updateAccountCredentials: async (accountId, payload) => {
    const updatedAcc = await accountsApi.updateAccountCredentials(accountId, payload);
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, ...updatedAcc } : a))
    }));
    get().addActivityLog(
      'Account Credentials Updated',
      `Updated credentials for account ${updatedAcc.name} (${updatedAcc.clientId}). Status: ${updatedAcc.status}.`,
      'Account',
      updatedAcc.status === 'Connected' ? 'SUCCESS' : 'WARNING'
    );
    return updatedAcc;
  },

  deleteAccount: async (accountId) => {
    await accountsApi.deleteAccount(accountId);
    set((state) => {
      const targetAccount = state.accounts.find((a) => a.id === accountId);
      const updatedAlgos = state.algos.map((algo) => ({
        ...algo,
        assignedAccounts: algo.assignedAccounts.filter((id) => id !== accountId),
        accountAllocations: algo.accountAllocations.filter((a) => a.accountId !== accountId)
      }));

      if (targetAccount) {
        get().addActivityLog(
          'Account Deleted',
          `Trading account ${targetAccount.name} (${targetAccount.clientId}) deleted successfully.`,
          'Account',
          'WARNING'
        );
      }

      return {
        accounts: state.accounts.filter((a) => a.id !== accountId),
        algos: updatedAlgos,
        selectedAccountId: state.selectedAccountId === accountId ? 'ALL' : state.selectedAccountId
      };
    });
  },

  updateAlgoStatus: (algoId, status) => {
    set((state) => {
      const updated = state.algos.map((algo) => {
        if (algo.id === algoId) {
          get().addActivityLog(
            `Algo Status Changed`,
            `Algorithm "${algo.name}" changed status to ${status}.`,
            'Algo',
            status === 'Active' ? 'SUCCESS' : status === 'Stopped' ? 'WARNING' : 'INFO'
          );
          return { ...algo, status };
        }
        return algo;
      });
      return { algos: updated };
    });
  },

  addAlgorithm: (algo) => {
    set((state) => ({ algos: [algo, ...state.algos] }));
    get().addActivityLog(
      'Strategy Created',
      `New strategy "${algo.name}" created for ${algo.underlying}.`,
      'Algo',
      'SUCCESS'
    );
  },

  updateAlgorithm: (algo) => {
    set((state) => ({
      algos: state.algos.map((a) => (a.id === algo.id ? algo : a))
    }));
  },

  deleteAlgorithm: (algoId) => {
    set((state) => {
      const targetAlgo = state.algos.find((a) => a.id === algoId);
      if (!targetAlgo) return state;

      get().addActivityLog(
        'Strategy Deleted',
        `Algorithm strategy "${targetAlgo.name}" was permanently deleted.`,
        'Algo',
        'WARNING'
      );

      return {
        algos: state.algos.filter((a) => a.id !== algoId)
      };
    });
  },

  placeOrder: async (payload) => {
    const res = await ordersApi.createOrder(payload);
    await get().fetchOrders();
    await get().fetchPositions();
    await get().fetchAccounts();
    return res;
  },

  exitPosition: async (positionId) => {
    await positionsApi.exitPosition(positionId);
    await get().fetchPositions();
    await get().fetchOrders();
  },

  exitAllPositions: async () => {
    await positionsApi.exitAllPositions();
    await get().fetchPositions();
    await get().fetchOrders();
  },

  emergencyStopAll: () => {
    set((state) => {
      const stoppedAlgos = state.algos.map((a) => ({ ...a, status: 'Stopped' as const }));
      const disabledAccounts = state.accounts.map((acc) => ({ ...acc, isEnabled: false, status: 'Disconnected' as const }));
      const closedPositions = state.positions.map((p) => ({ ...p, status: 'CLOSED' as const, quantity: 0, realizedPnL: p.unrealizedPnL }));

      get().addActivityLog(
        'GLOBAL EMERGENCY KILL SWITCH ACTIVATED',
        'All automated trading algorithms stopped. All open market positions liquidated. Account execution disabled.',
        'Risk',
        'ERROR'
      );

      return {
        algos: stoppedAlgos,
        accounts: disabledAccounts,
        positions: closedPositions,
        riskLimit: { ...state.riskLimit, globalKillSwitchActive: true }
      };
    });
  },

  updateMarketQuote: (symbol, ltpDelta) => {
    set((state) => {
      const current = state.marketQuotes[symbol];
      if (!current) return state;

      const newLtp = Math.round((current.ltp + ltpDelta) * 100) / 100;
      const newChange = Math.round((newLtp - current.prevClose) * 100) / 100;
      const newChangePercent = Math.round((newChange / current.prevClose * 100) * 100) / 100;

      // Update positions LTP & P&L
      const updatedPositions = state.positions.map((pos) => {
        if (pos.status === 'OPEN' && pos.underlying === symbol) {
          const delta = pos.type === 'CE' ? ltpDelta * 0.5 : ltpDelta * -0.5;
          const posLtp = Math.max(1, Math.round((pos.ltp + delta) * 100) / 100);
          const pnlPerUnit = pos.quantity > 0 ? posLtp - pos.averagePrice : pos.averagePrice - posLtp;
          const totalPnL = Math.round((pnlPerUnit * Math.abs(pos.quantity)) * 100) / 100;
          const pnlPct = Math.round(((pnlPerUnit / pos.averagePrice) * 100) * 100) / 100;

          return {
            ...pos,
            ltp: posLtp,
            unrealizedPnL: totalPnL,
            pnlPercent: pnlPct
          };
        }
        return pos;
      });

      return {
        marketQuotes: {
          ...state.marketQuotes,
          [symbol]: {
            ...current,
            ltp: newLtp,
            change: newChange,
            changePercent: newChangePercent,
            high: Math.max(current.high, newLtp),
            low: Math.min(current.low, newLtp),
            lastUpdated: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST'
          }
        },
        positions: updatedPositions
      };
    });
  },

  setWsStatus: (connected, latency = 14) => set({ wsConnected: connected, wsLatencyMs: latency }),

  addActivityLog: (title, message, category, severity) => {
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
      category,
      severity,
      title,
      message
    };
    set((state) => ({ activityLogs: [newLog, ...state.activityLogs.slice(0, 99)] }));
  }
}));

