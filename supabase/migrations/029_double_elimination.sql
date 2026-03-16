-- ============================================
-- ダブルエリミネーション対応
-- matches テーブルに敗者ルーティング用カラム追加
-- ============================================

-- 敗者が落ちる先のmatch参照
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_match_id UUID REFERENCES matches(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_match_slot SMALLINT;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_matches_loser_match ON matches(loser_match_id);
CREATE INDEX IF NOT EXISTS idx_matches_bracket_side ON matches(bracket_side);
