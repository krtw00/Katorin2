-- ============================================
-- 013: 大会設定の可変化 + 画像テーマ
-- ============================================

-- 大会形式の可変パラメータ
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS order_size SMALLINT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS sub_count SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS players_per_round SMALLINT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS win_point_value SMALLINT NOT NULL DEFAULT 3;

-- 画像テーマ設定（大会ごとのビジュアルカスタマイズ）
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS theme_config JSONB NOT NULL DEFAULT '{
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e40af",
    "accentColor": "#f59e0b",
    "bgColor": "#0f172a",
    "textColor": "#f8fafc",
    "fontFamily": "sans-serif",
    "backgroundImage": null,
    "logoUrl": null
  }'::jsonb;
