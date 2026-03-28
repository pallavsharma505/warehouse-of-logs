import { Database } from "bun:sqlite";
import { resolve } from "path";

const DB_PATH =
  process.env.DATABASE_PATH ||
  resolve(import.meta.dir, "../../../database/logs.sqlite");

let db: Database | null = null;

export function getDatabase(): Database {
  if (db) return db;

  db = new Database(DB_PATH, { create: true });

  // Enable WAL mode for concurrent read/write access
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA busy_timeout = 5000;");
  db.run("PRAGMA synchronous = NORMAL;");
  db.run("PRAGMA cache_size = -20000;"); // 20MB cache

  return db;
}

export function initializeSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      app_name TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      persist INTEGER NOT NULL DEFAULT 0,
      expires_at DATETIME
    );
  `);

  // Migration: add columns if they don't exist (for existing databases)
  const cols = database
    .prepare("PRAGMA table_info(logs)")
    .all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("persist")) {
    database.run("ALTER TABLE logs ADD COLUMN persist INTEGER NOT NULL DEFAULT 0;");
  }
  if (!colNames.includes("expires_at")) {
    database.run("ALTER TABLE logs ADD COLUMN expires_at DATETIME;");
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME
    );
  `);

  database.run(
    "CREATE INDEX IF NOT EXISTS idx_logs_app_name ON logs (app_name);"
  );
  database.run("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs (level);");
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp DESC);"
  );
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_logs_expires_at ON logs (expires_at);"
  );
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);"
  );
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function cleanExpiredLogs(database: Database): number {
  const result = database.run(
    "DELETE FROM logs WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')"
  );
  return result.changes;
}
