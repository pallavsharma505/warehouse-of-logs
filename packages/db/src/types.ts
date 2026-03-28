export interface LogEntry {
  id: string;
  app_name: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
  created_at?: string;
  persist: boolean;
  expires_at: string | null;
}

export interface LogRow {
  id: string;
  app_name: string;
  level: string;
  message: string;
  metadata: string | null;
  timestamp: string;
  created_at: string;
  persist: number;
  expires_at: string | null;
}

export interface LogQueryParams {
  level?: string;
  app_name?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  by_level: Record<string, number>;
  by_app: Record<string, number>;
  recent_rate: number; // logs in last hour
}

export interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
}
