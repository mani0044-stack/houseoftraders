export type SeverityLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type ActivityCategory = 
  | 'System' 
  | 'Account' 
  | 'Algo' 
  | 'Order' 
  | 'Position' 
  | 'Risk' 
  | 'WebSocket';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  category: ActivityCategory;
  severity: SeverityLevel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}
