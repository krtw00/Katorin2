-- ============================================
-- 新規ユーザー登録時にprofilesを自動作成するトリガー
-- 匿名名バージョン（大会ごとにニックネームを入力させるため）
-- ============================================

-- 新規ユーザー作成時にプロフィールを自動作成する関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    'Player',  -- 匿名のデフォルト名（大会ごとにニックネームを入力させる）
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- auth.usersへの新規挿入時にトリガーを実行
-- （既存の場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;
