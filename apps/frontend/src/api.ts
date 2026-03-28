const API_BASE = "/api";

// --- Auth ---

const TOKEN_KEY = "wol_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  return res;
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error || `Login failed: ${res.status}`);
  }
  const data = await res.json();
  setToken(data.token);
}

export function logout(): void {
  clearToken();
  window.location.href = "/login";
}

// --- Types ---

export interface LogEntry {
  id: string;
  app_name: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  created_at: string;
  persist: boolean;
  expires_at: string | null;
}

export interface LogsResponse {
  data: LogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface StatsResponse {
  period_hours: number;
  total: number;
  by_level: Record<string, number>;
  by_app: Record<string, number>;
  per_hour: { hour: string; count: number }[];
  recent_rate: number;
}

export interface LogsQueryParams {
  level?: string;
  app_name?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function fetchLogs(params: LogsQueryParams): Promise<LogsResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const res = await authFetch(`${API_BASE}/logs?${searchParams}`);
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  return res.json();
}

export async function fetchLog(id: string): Promise<LogEntry> {
  const res = await authFetch(`${API_BASE}/logs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch log: ${res.status}`);
  return res.json();
}

export async function fetchStats(hours = 24, app_name?: string): Promise<StatsResponse> {
  const searchParams = new URLSearchParams({ hours: String(hours) });
  if (app_name) searchParams.set("app_name", app_name);

  const res = await authFetch(`${API_BASE}/stats?${searchParams}`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

export async function fetchApps(): Promise<string[]> {
  const res = await authFetch(`${API_BASE}/apps`);
  if (!res.ok) throw new Error(`Failed to fetch apps: ${res.status}`);
  return res.json();
}

// --- API Key Management ---

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
}

export interface ApiKeyCreated extends ApiKey {
  key: string; // Full key, only returned on creation
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await authFetch(`${API_BASE}/keys`);
  if (!res.ok) throw new Error(`Failed to fetch API keys: ${res.status}`);
  return res.json();
}

export async function createApiKey(name: string): Promise<ApiKeyCreated> {
  const res = await authFetch(`${API_BASE}/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to create key: ${res.status}`);
  }
  return res.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/keys/${encodeURIComponent(id)}/revoke`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to revoke key: ${res.status}`);
  }
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to delete key: ${res.status}`);
  }
}
