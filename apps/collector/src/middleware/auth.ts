import type { Context, Next } from "hono";
import { getDatabase } from "@warehouse/db";

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function apiKeyAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const [scheme, key] = authHeader.split(" ");

  if (scheme !== "Bearer" || !key) {
    return c.json({ error: "Invalid Authorization format. Use: Bearer <api-key>" }, 401);
  }

  // Check against database keys
  const keyHash = await hashKey(key);
  const db = getDatabase();
  const row = db
    .prepare("SELECT id FROM api_keys WHERE key_hash = ? AND status = 'active'")
    .get(keyHash);

  if (!row) {
    return c.json({ error: "Invalid or revoked API key" }, 403);
  }

  await next();
}
