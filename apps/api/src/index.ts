import { Hono } from "hono";
import { cors } from "hono/cors";
import { ulid } from "ulid";
import { getDatabase, initializeSchema } from "@warehouse/db";
import type { LogRow, ApiKeyRow } from "@warehouse/db";
import { logsQuerySchema, statsQuerySchema } from "./schemas";

const app = new Hono();
const db = getDatabase();
initializeSchema(db);

// Enable CORS for frontend
app.use("*", cors({ origin: "*" }));

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "api" }));

// GET /logs - Query logs with filtering, search, and pagination
app.get("/logs", (c) => {
  const parsed = logsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      400
    );
  }

  const { level, app_name, search, from, to, limit, offset } = parsed.data;

  const conditions: string[] = ["(expires_at IS NULL OR expires_at > datetime('now'))"];
  const params: unknown[] = [];

  if (level) {
    conditions.push("level = ?");
    params.push(level);
  }
  if (app_name) {
    conditions.push("app_name = ?");
    params.push(app_name);
  }
  if (search) {
    conditions.push("message LIKE ?");
    params.push(`%${search}%`);
  }
  if (from) {
    conditions.push("timestamp >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("timestamp <= ?");
    params.push(to);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM logs ${whereClause}`)
    .get(...params) as { total: number };

  // Get paginated results
  const rows = db
    .prepare(
      `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as LogRow[];

  const logs = rows.map((row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    persist: Boolean(row.persist),
  }));

  return c.json({
    data: logs,
    pagination: {
      total: countRow.total,
      limit,
      offset,
      hasMore: offset + limit < countRow.total,
    },
  });
});

// GET /logs/:id - Get a single log entry
app.get("/logs/:id", (c) => {
  const id = c.req.param("id");
  const row = db.prepare("SELECT * FROM logs WHERE id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))").get(id) as
    | LogRow
    | undefined;

  if (!row) {
    return c.json({ error: "Log not found" }, 404);
  }

  return c.json({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    persist: Boolean(row.persist),
  });
});

// GET /stats - Aggregated statistics
app.get("/stats", (c) => {
  const parsed = statsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      400
    );
  }

  const { app_name, hours } = parsed.data;
  const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const appFilter = app_name ? "AND app_name = ?" : "";
  const appParams = app_name ? [app_name] : [];
  const expiryFilter = "AND (expires_at IS NULL OR expires_at > datetime('now'))";

  // Total count
  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as total FROM logs WHERE timestamp >= ? ${appFilter} ${expiryFilter}`
    )
    .get(sinceDate, ...appParams) as { total: number };

  // Count by level
  const byLevel = db
    .prepare(
      `SELECT level, COUNT(*) as count FROM logs WHERE timestamp >= ? ${appFilter} ${expiryFilter} GROUP BY level`
    )
    .all(sinceDate, ...appParams) as { level: string; count: number }[];

  // Count by app
  const byApp = db
    .prepare(
      `SELECT app_name, COUNT(*) as count FROM logs WHERE timestamp >= ? ${appFilter} ${expiryFilter} GROUP BY app_name ORDER BY count DESC LIMIT 20`
    )
    .all(sinceDate, ...appParams) as { app_name: string; count: number }[];

  // Logs per hour (for chart)
  const perHour = db
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:00:00Z', timestamp) as hour, COUNT(*) as count
       FROM logs WHERE timestamp >= ? ${appFilter} ${expiryFilter}
       GROUP BY hour ORDER BY hour`
    )
    .all(sinceDate, ...appParams) as { hour: string; count: number }[];

  // Recent rate (last hour)
  const lastHourDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM logs WHERE timestamp >= ? ${appFilter} ${expiryFilter}`
    )
    .get(lastHourDate, ...appParams) as { count: number };

  return c.json({
    period_hours: hours,
    total: totalRow.total,
    by_level: Object.fromEntries(byLevel.map((r) => [r.level, r.count])),
    by_app: Object.fromEntries(byApp.map((r) => [r.app_name, r.count])),
    per_hour: perHour,
    recent_rate: recentRow.count,
  });
});

// GET /apps - List distinct app names
app.get("/apps", (c) => {
  const rows = db
    .prepare("SELECT DISTINCT app_name FROM logs WHERE (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY app_name")
    .all() as { app_name: string }[];

  return c.json(rows.map((r) => r.app_name));
});

// --- API Key Management ---

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "wol_";
  for (let i = 0; i < 40; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// GET /keys - List all API keys (without exposing full key)
app.get("/keys", (c) => {
  const rows = db
    .prepare(
      "SELECT id, name, key_prefix, status, created_at, revoked_at FROM api_keys ORDER BY created_at DESC"
    )
    .all() as Omit<ApiKeyRow, "key_hash">[];

  return c.json(rows);
});

// POST /keys - Create a new API key
app.post("/keys", async (c) => {
  const body = await c.req.json();
  const name = body?.name;

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
    return c.json({ error: "A name is required (1-255 characters)" }, 400);
  }

  const id = ulid();
  const rawKey = generateApiKey();
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10) + "...";

  db.prepare(
    "INSERT INTO api_keys (id, name, key_hash, key_prefix, status) VALUES (?, ?, ?, ?, 'active')"
  ).run(id, name.trim(), keyHash, keyPrefix);

  // Return the full key only once at creation time
  return c.json(
    { id, name: name.trim(), key: rawKey, key_prefix: keyPrefix, status: "active" },
    201
  );
});

// PATCH /keys/:id/revoke - Revoke an API key
app.patch("/keys/:id/revoke", (c) => {
  const id = c.req.param("id");

  const row = db.prepare("SELECT id, status FROM api_keys WHERE id = ?").get(id) as
    | Pick<ApiKeyRow, "id" | "status">
    | undefined;

  if (!row) {
    return c.json({ error: "API key not found" }, 404);
  }
  if (row.status === "revoked") {
    return c.json({ error: "Key is already revoked" }, 400);
  }

  db.prepare(
    "UPDATE api_keys SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(id);

  return c.json({ message: "Key revoked" });
});

// DELETE /keys/:id - Delete an API key permanently
app.delete("/keys/:id", (c) => {
  const id = c.req.param("id");

  const row = db.prepare("SELECT id FROM api_keys WHERE id = ?").get(id) as
    | Pick<ApiKeyRow, "id">
    | undefined;

  if (!row) {
    return c.json({ error: "API key not found" }, 404);
  }

  db.prepare("DELETE FROM api_keys WHERE id = ?").run(id);

  return c.json({ message: "Key deleted" });
});

const PORT = Number(process.env.API_PORT) || 7002;

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`API service running on http://localhost:${PORT}`);
