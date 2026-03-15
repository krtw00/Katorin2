-- ============================================
-- 021: デモアカウントの作成データに自動でis_demo=trueを付与
-- デモユーザー（@katorin2.codenica.dev）が作成した
-- series/tournamentsに自動でis_demoフラグを設定
-- ============================================

CREATE OR REPLACE FUNCTION auto_set_demo_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email LIKE '%@katorin2.codenica.dev'
  ) THEN
    NEW.is_demo := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_demo_flag_series
  BEFORE INSERT ON series
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_demo_flag();

CREATE TRIGGER set_demo_flag_tournaments
  BEFORE INSERT ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_demo_flag();
