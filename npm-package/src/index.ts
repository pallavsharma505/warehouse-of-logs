export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogEntry {
  /** Application or service name */
  app_name: string;
  /** Log severity level */
  level: LogLevel;
  /** Log message (max 10,000 characters) */
  message: string;
  /** ISO 8601 timestamp — defaults to now if omitted */
  timestamp?: string;
  /** Arbitrary key-value metadata */
  metadata?: Record<string, unknown>;
  /** If true, the log is stored indefinitely. Defaults to false (temporary). */
  persist?: boolean;
  /** Time-to-live in seconds before the log expires. Defaults to 86400 (1 day). Ignored when persist is true. */
  expires_in?: number;
}

export interface WolClientOptions {
  /** Base URL of the collector service (e.g. "http://localhost:7001") */
  collectorUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Default app_name applied to all logs when not specified per-entry */
  appName?: string;
  /** Default persist flag applied to all logs. Defaults to false. */
  persist?: boolean;
  /** Default expires_in (seconds) applied to temporary logs */
  expiresIn?: number;
  /** Maximum number of logs to buffer before auto-flushing. Defaults to 50. Set to 1 to disable batching. */
  batchSize?: number;
  /** Maximum time in ms to wait before flushing the buffer. Defaults to 5000. */
  flushInterval?: number;
}

interface IngestResponse {
  message: string;
  count?: number;
}

export class WolClient {
  private readonly collectorUrl: string;
  private readonly apiKey: string;
  private readonly appName?: string;
  private readonly persist: boolean;
  private readonly expiresIn?: number;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  private buffer: Record<string, unknown>[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: WolClientOptions) {
    this.collectorUrl = options.collectorUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.appName = options.appName;
    this.persist = options.persist ?? false;
    this.expiresIn = options.expiresIn;
    this.batchSize = options.batchSize ?? 50;
    this.flushInterval = options.flushInterval ?? 5000;

    if (this.flushInterval > 0 && this.batchSize > 1) {
      this.timer = setInterval(() => this.flush(), this.flushInterval);
      // Allow the process to exit even if the timer is still running
      if (typeof this.timer === "object" && "unref" in this.timer) {
        this.timer.unref();
      }
    }
  }

  private buildEntry(entry: LogEntry) {
    const built: Record<string, unknown> = {
      app_name: entry.app_name ?? this.appName,
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    };

    if (!built.app_name) {
      throw new Error(
        "app_name is required — set it in the constructor (appName) or in each log entry"
      );
    }

    if (entry.metadata) built.metadata = entry.metadata;

    const persist = entry.persist ?? this.persist;
    if (persist) {
      built.persist = true;
    } else if (entry.expires_in ?? this.expiresIn) {
      built.expires_in = entry.expires_in ?? this.expiresIn;
    }

    return built;
  }

  // ---- Core logging methods ----

  /** Send a single log immediately (bypasses the buffer) */
  async send(entry: LogEntry): Promise<IngestResponse> {
    const body = this.buildEntry(entry);
    return this.post(body);
  }

  /** Add a log to the internal buffer. Flushes automatically when batchSize is reached. */
  log(entry: LogEntry): void {
    this.buffer.push(this.buildEntry(entry));
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  // ---- Level shortcuts ----

  info(message: string, meta?: Omit<LogEntry, "level" | "message">): void {
    this.log({ level: "INFO", message, app_name: this.appName!, ...meta });
  }

  warn(message: string, meta?: Omit<LogEntry, "level" | "message">): void {
    this.log({ level: "WARN", message, app_name: this.appName!, ...meta });
  }

  error(message: string, meta?: Omit<LogEntry, "level" | "message">): void {
    this.log({ level: "ERROR", message, app_name: this.appName!, ...meta });
  }

  debug(message: string, meta?: Omit<LogEntry, "level" | "message">): void {
    this.log({ level: "DEBUG", message, app_name: this.appName!, ...meta });
  }

  // ---- Flush & cleanup ----

  /** Flush all buffered logs to the collector. Returns the number of logs sent. */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const batch = this.buffer.splice(0);
    await this.post(batch);
    return batch.length;
  }

  /** Flush remaining logs and stop the background flush timer. Call this before process exit. */
  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  // ---- Internal ----

  private async post(body: unknown): Promise<IngestResponse> {
    const res = await fetch(`${this.collectorUrl}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WarehouseOfLogs ingestion failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<IngestResponse>;
  }
}

export default WolClient;
