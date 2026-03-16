-- ============================================
-- Discord Webhook URL を series / tournaments に追加
-- Discord OAuth ログイン時に discord_id を自動保存
-- ============================================

-- series テーブルに discord_webhook_url カラム追加
ALTER TABLE series ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

-- tournaments テーブルに discord_webhook_url カラム追加
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

-- handle_new_user トリガーを更新: Discord OAuth 時に discord_id を自動保存
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, discord_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    -- Discord OAuth の場合、full_name を discord_id に保存
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'discord'
      THEN COALESCE(
        NEW.raw_user_meta_data->'custom_claims'->>'global_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
      )
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
