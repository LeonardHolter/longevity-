import { neon } from "@neondatabase/serverless";

/**
 * Returns a tagged-template SQL function connected to Neon.
 * Each call creates a fresh HTTP-based connection (stateless, no pool needed).
 */
export function getDb() {
  return neon(process.env.DATABASE_URL!);
}

/**
 * Ensure the user_data table exists. Called lazily on first request.
 * Uses IF NOT EXISTS so it's safe to call repeatedly.
 */
let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, key)
    )
  `;
  initialized = true;
}
