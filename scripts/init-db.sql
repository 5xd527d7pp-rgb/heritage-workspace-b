-- Neon SQL Editor で実行（第7回: DB に記憶を持たせる）
-- 編集状態を JSONB 1 行で保持（localStorage と同じ形）

CREATE TABLE IF NOT EXISTS workspace_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
