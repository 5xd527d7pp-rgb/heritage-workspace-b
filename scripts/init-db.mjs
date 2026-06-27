/**
 * Neon に workspace_state テーブルを作成する。
 * 使い方: .env.local に DATABASE_URL を設定 → npm run db:init
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  try {
    const envPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      ".env.local",
    );
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key === "DATABASE_URL") process.env.DATABASE_URL = value;
    }
  } catch {
    // .env.local が無い
  }
}

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL が未設定です。\n" +
      "  1. cp .env.local.example .env.local\n" +
      "  2. Neon の接続文字列を DATABASE_URL= に貼り付け\n" +
      "  3. npm run db:init を再実行",
  );
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS workspace_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

console.log("OK: workspace_state テーブルを作成しました。");
