/**
 * GET / PUT / DELETE /api/workspace
 *
 * 講義第7回: Neon(Postgres) への永続化。
 * DATABASE_URL 未設定時は 503 → クライアントは localStorage にフォールバック。
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, WORKSPACE_ROW_ID } from "@/lib/db/client";
import { persistedSchema } from "@/lib/persistence/schema";

export async function GET() {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const rows = await sql`
    SELECT data FROM workspace_state WHERE id = ${WORKSPACE_ROW_ID}
  `;

  if (rows.length === 0) {
    return NextResponse.json(null);
  }

  const parsed = persistedSchema.safeParse(rows[0].data);
  if (!parsed.success) {
    return NextResponse.json(null);
  }

  return NextResponse.json(parsed.data);
}

export async function PUT(request: NextRequest) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const body: unknown = await request.json();
  const parsed = persistedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid workspace payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await sql`
    INSERT INTO workspace_state (id, data, updated_at)
    VALUES (${WORKSPACE_ROW_ID}, ${JSON.stringify(parsed.data)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  await sql`DELETE FROM workspace_state WHERE id = ${WORKSPACE_ROW_ID}`;
  return NextResponse.json({ ok: true });
}
