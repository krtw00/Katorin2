-- ============================================
-- 014: デモデータフラグ
-- ============================================
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_tournaments_demo ON tournaments(is_demo);
