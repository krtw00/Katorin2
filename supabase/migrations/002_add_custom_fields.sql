-- ============================================
-- カスタム入力項目対応
-- ============================================

-- tournamentsにカスタム入力項目定義を追加
-- 形式: [{ "key": "discord_id", "label": "Discord ID", "required": false, "placeholder": "例: User#1234" }]
ALTER TABLE tournaments
ADD COLUMN custom_fields JSONB DEFAULT '[]'::jsonb;

-- participantsに表示名とカスタムデータを追加
ALTER TABLE participants
ADD COLUMN display_name VARCHAR(50),
ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;

-- master_duel_id は互換性のため残すが、今後は custom_data を使用
COMMENT ON COLUMN participants.master_duel_id IS 'Deprecated: Use custom_data instead';
COMMENT ON COLUMN tournaments.custom_fields IS 'Custom entry fields: [{ key, label, required, placeholder }]';
COMMENT ON COLUMN participants.display_name IS 'Display name for this tournament (can differ from profile)';
COMMENT ON COLUMN participants.custom_data IS 'Custom field values: { key: value }';
