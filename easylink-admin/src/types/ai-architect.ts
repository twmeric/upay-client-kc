export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    action?: string;
    data?: any;
    suggestions?: string[];
  };
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  context?: {
    currentPage?: string;
    selectedMerchant?: any;
    filters?: any;
  };
}

export interface AICommand {
  name: string;
  description: string;
  handler: (args: string[], context: any) => Promise<string>;
}

export interface AnalysisResult {
  type: 'trend' | 'anomaly' | 'merchant' | 'transaction' | 'general';
  summary: string;
  details: any;
  recommendations: string[];
}

export type AIAction = 
  | { type: 'navigate'; page: string }
  | { type: 'filter'; entity: string; criteria: any }
  | { type: 'export'; format: 'csv' | 'pdf' | 'excel' }
  | { type: 'alert'; message: string; level: 'info' | 'warning' | 'error' }
  | { type: 'recommend'; action: string; reason: string }
  | null;
