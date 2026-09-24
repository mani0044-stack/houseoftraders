import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMarketPage } from './pages/LiveMarketPage';
import { OptionChainPage } from './pages/OptionChainPage';
import { AlgoManagerPage } from './pages/AlgoManagerPage';
import { CreateAlgoPage } from './pages/CreateAlgoPage';
import { AccountsPage } from './pages/AccountsPage';
import { PositionsPage } from './pages/PositionsPage';
import { OrdersPage } from './pages/OrdersPage';
import { TradeHistoryPage } from './pages/TradeHistoryPage';
import { RiskManagerPage } from './pages/RiskManagerPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { PaperTradingPage } from './pages/PaperTradingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="live-market" element={<LiveMarketPage />} />
            <Route path="option-chain" element={<OptionChainPage />} />
            <Route path="create-algo" element={<CreateAlgoPage />} />
            <Route path="algo-manager" element={<AlgoManagerPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="positions" element={<PositionsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="trade-history" element={<TradeHistoryPage />} />
            <Route path="risk-manager" element={<RiskManagerPage />} />
            <Route path="backtesting" element={<BacktestingPage />} />
            <Route path="paper-trading" element={<PaperTradingPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="activity-logs" element={<ActivityLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
