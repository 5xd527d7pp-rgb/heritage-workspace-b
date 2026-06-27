import { neon } from "@neondatabase/serverless";

/** DATABASE_URL 未設定時は null（localStorage フォールバック）。 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export const WORKSPACE_ROW_ID = "default";
