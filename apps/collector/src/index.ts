import { Hono } from "hono";
import { ulid } from "ulid";
import { getDatabase, initializeSchema, cleanExpiredLogs } from "@warehouse/db";
import { singleLogSchema, batchLogSchema } from "./schemas";
import type { SingleLogInput } from "./schemas";
import { apiKeyAuth } from "./middleware/auth";

const app = new Hono();

// Initialize database
const db = getDatabase();
initializeSchema(db);

// Prepare insert statement for performance
const insertStmt = db.prepare(`
  INSERT INTO logs (id, app_name, level, message, metadata, timestamp, persist, expires_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const DEFAULT_EXPIRY_SECONDS = 86400; // 1 day

function computeExpiresAt(log: SingleLogInput): string | null {
  if (log.persist) return null; // persistent logs never expire
  const seconds = log.expires_in ?? DEFAULT_EXPIRY_SECONDS;
  const d = new Date(Date.now() + seconds * 1000);
  // Use SQLite-compatible format: YYYY-MM-DD HH:MM:SS
  return d.toISOString().replace("T", " ").replace("Z", "").split(".")[0];
}

const insertMany = db.transaction((logs: SingleLogInput[]) => {
  for (const log of logs) {
    insertStmt.run(
      ulid(),
      log.app_name,
      log.level,
      log.message,
      log.metadata ? JSON.stringify(log.metadata) : null,
      log.timestamp,
      log.persist ? 1 : 0,
      computeExpiresAt(log)
    );
  }
});

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "collector" }));

// Ingestion endpoint — protected by API key
app.post("/ingest", apiKeyAuth, async (c) => {
  const body = await c.req.json();

  // Determine if single or batch
  if (Array.isArray(body)) {
    const result = batchLogSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: "Validation failed", details: result.error.flatten() },
        400
      );
    }

    insertMany(result.data);

    return c.json({ message: "Batch ingested", count: result.data.length }, 201);
  }

  // Single log
  const result = singleLogSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      { error: "Validation failed", details: result.error.flatten() },
      400
    );
  }

  insertStmt.run(
    ulid(),
    result.data.app_name,
    result.data.level,
    result.data.message,
    result.data.metadata ? JSON.stringify(result.data.metadata) : null,
    result.data.timestamp,
    result.data.persist ? 1 : 0,
    computeExpiresAt(result.data)
  );

  return c.json({ message: "Log ingested" }, 201);
});

const PORT = Number(process.env.COLLECTOR_PORT) || 7001;

// Clean expired logs every 5 minutes
setInterval(() => {
  const deleted = cleanExpiredLogs(db);
  if (deleted > 0) console.log(`Cleaned ${deleted} expired logs`);
}, 5 * 60 * 1000);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`Collector service running on http://localhost:${PORT}`);
