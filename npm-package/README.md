# warehouse-of-logs-client

A lightweight TypeScript/JavaScript client for the [WarehouseOfLogs](https://github.com/warehouse-of-logs) log aggregation service. Supports single and batched log ingestion, automatic flushing, log levels, temporary/persistent logs, and metadata.

## Installation

```bash
npm install warehouse-of-logs-client
```

```bash
bun add warehouse-of-logs-client
```

## Quick Start

```ts
import { WolClient } from "warehouse-of-logs-client";

const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "wol_your_api_key_here",
  appName: "my-service",
});

logger.info("User signed in", { metadata: { userId: "abc123" } });
logger.error("Payment failed", { metadata: { orderId: 42 } });

// Flush before exiting
await logger.shutdown();
```

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `collectorUrl` | `string` | **(required)** | Base URL of the collector service |
| `apiKey` | `string` | **(required)** | API key for authentication (Bearer token) |
| `appName` | `string` | — | Default `app_name` applied to every log. Can be overridden per entry. |
| `persist` | `boolean` | `false` | Default retention. `false` = temporary (auto-expires), `true` = stored indefinitely. |
| `expiresIn` | `number` | — | Default TTL in **seconds** for temporary logs. Server default is 86400 (1 day). |
| `batchSize` | `number` | `50` | Logs are buffered and sent in batches of this size. Set to `1` to send each log immediately. |
| `flushInterval` | `number` | `5000` | Max time in **ms** before the buffer is auto-flushed. |

## Logging Methods

### Level Shortcuts

The easiest way to log. These buffer logs internally and flush automatically.

```ts
logger.info("Server started on port 3000");
logger.warn("Disk usage above 80%");
logger.error("Unhandled exception in /api/users");
logger.debug("Cache miss for key session:abc");
```

All shortcuts accept an optional second argument to set metadata, persistence, custom app name, or TTL:

```ts
logger.info("Order placed", {
  app_name: "orders-service",  // override the default appName
  metadata: { orderId: 123, total: 59.99 },
  persist: true,               // keep this log forever
});

logger.debug("Temp trace", {
  expires_in: 300,  // auto-delete after 5 minutes
});
```

### `log(entry)`

Add a log to the buffer with full control over all fields:

```ts
logger.log({
  app_name: "worker",
  level: "ERROR",
  message: "Job failed after 3 retries",
  timestamp: new Date().toISOString(),  // optional, defaults to now
  metadata: { jobId: "j-99", queue: "emails" },
  persist: true,
});
```

### `send(entry)` — Immediate (no batching)

Sends a single log directly to the collector, bypassing the buffer. Returns a promise.

```ts
await logger.send({
  app_name: "auth-service",
  level: "ERROR",
  message: "Critical: database connection lost",
  persist: true,
});
```

## Flushing & Shutdown

Logs are batched in memory and sent when either `batchSize` is reached or `flushInterval` elapses.

```ts
// Manually flush buffered logs
const count = await logger.flush();
console.log(`Flushed ${count} logs`);

// Flush + stop the background timer (call before process exit)
await logger.shutdown();
```

For graceful shutdowns:

```ts
process.on("SIGTERM", async () => {
  await logger.shutdown();
  process.exit(0);
});
```

## Log Entry Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `app_name` | `string` | Yes* | Source application name. *Optional if `appName` is set in the constructor. |
| `level` | `"INFO" \| "WARN" \| "ERROR" \| "DEBUG"` | Yes | Severity level |
| `message` | `string` | Yes | Log message (max 10,000 chars) |
| `timestamp` | `string` | No | ISO 8601 datetime. Defaults to `new Date().toISOString()`. |
| `metadata` | `Record<string, unknown>` | No | Arbitrary key-value data attached to the log |
| `persist` | `boolean` | No | `true` = permanent, `false` = temporary (default) |
| `expires_in` | `number` | No | TTL in seconds for temporary logs. Server default: 86400 (1 day). Ignored when `persist` is `true`. |

## Temporary vs Persistent Logs

By default, all logs are **temporary** and expire after 1 day. You can control this at three levels:

```ts
// 1. Client-wide defaults
const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "wol_...",
  appName: "my-app",
  persist: false,      // default: temporary
  expiresIn: 3600,     // default: expire after 1 hour
});

// 2. Per-log override — this one is permanent
logger.info("Deploy succeeded", { persist: true });

// 3. Per-log TTL — expires in 10 minutes
logger.debug("Request trace", { expires_in: 600 });
```

Priority: per-log `persist`/`expires_in` > client defaults > server defaults.

## Examples

### Express Middleware

```ts
import express from "express";
import { WolClient } from "warehouse-of-logs-client";

const app = express();
const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "wol_...",
  appName: "express-api",
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.path} ${res.statusCode}`, {
      metadata: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      },
    });
  });
  next();
});
```

### Error Tracking

```ts
process.on("uncaughtException", async (err) => {
  await logger.send({
    app_name: "my-app",
    level: "ERROR",
    message: err.message,
    metadata: { stack: err.stack },
    persist: true,  // keep error logs permanently
  });
  process.exit(1);
});
```

### Batch Worker

```ts
const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "wol_...",
  appName: "batch-worker",
  batchSize: 200,        // send every 200 logs
  flushInterval: 10000,  // or every 10 seconds
  expiresIn: 7200,       // expire after 2 hours
});

for (const job of jobs) {
  logger.debug(`Processing job ${job.id}`);
  // ... process job ...
}

await logger.shutdown();
```

## License

Apache-2.0
