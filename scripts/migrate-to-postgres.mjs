#!/usr/bin/env node
/**
 * One-time migration: copies all user data from Clerk privateMetadata to Neon Postgres.
 * Run with: node scripts/migrate-to-postgres.mjs
 */

import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(import.meta.dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
const DATABASE_URL = env.DATABASE_URL;

if (!CLERK_SECRET_KEY || !DATABASE_URL) {
  console.error("Missing CLERK_SECRET_KEY or DATABASE_URL in .env.local");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
const sql = neon(DATABASE_URL);

const DATA_KEYS = [
  "foodLogs",
  "strengthLogs",
  "weightEntries",
  "weightPlan",
  "zetamacBest",
  "zetamacHistory",
];

async function main() {
  console.log("Creating table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, key)
    )
  `;
  console.log("✓ Table ready");

  console.log("Fetching users from Clerk...");
  const { data: users } = await clerk.users.getUserList({ limit: 100 });
  console.log(`Found ${users.length} user(s)`);

  let totalKeys = 0;
  let skipped = 0;

  for (const user of users) {
    const meta = user.privateMetadata || {};
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.id;
    console.log(`\nMigrating: ${name} (${user.id})`);

    for (const key of DATA_KEYS) {
      const value = meta[key];
      if (value === null || value === undefined) {
        skipped++;
        continue;
      }

      const jsonStr = JSON.stringify(value);
      const sizeKB = (Buffer.byteLength(jsonStr) / 1024).toFixed(1);

      await sql`
        INSERT INTO user_data (user_id, key, value, updated_at)
        VALUES (${user.id}, ${key}, ${jsonStr}::jsonb, NOW())
        ON CONFLICT (user_id, key)
        DO UPDATE SET value = ${jsonStr}::jsonb, updated_at = NOW()
      `;

      console.log(`  ✓ ${key} (${sizeKB} KB)`);
      totalKeys++;
    }
  }

  console.log(`\n✅ Migration complete: ${users.length} users, ${totalKeys} keys migrated, ${skipped} empty keys skipped`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
