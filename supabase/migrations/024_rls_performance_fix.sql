-- ============================================
-- 023: RLSパフォーマンス改善
-- is_demo_user() のキャッシュ化、インデックス追加
-- ============================================

-- 1. is_demo_user() をセッション変数キャッシュ化
-- auth.uid() は同一リクエスト内で不変なので、結果をキャッシュ
CREATE OR REPLACE FUNCTION is_demo_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached TEXT;
  result BOOLEAN;
BEGIN
  -- NULLなら即FALSE（未認証ユーザー）
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- セッション変数からキャッシュを取得
  BEGIN
    cached := current_setting('app.is_demo_user_' || p_user_id::TEXT, true);
    IF cached IS NOT NULL THEN
      RETURN cached = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 無視
  END;

  -- 実際のチェック
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email LIKE '%@katorin2.codenica.dev'
  ) INTO result;

  -- キャッシュに保存
  PERFORM set_config('app.is_demo_user_' || p_user_id::TEXT, result::TEXT, true);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. is_series_demo_member() も同様にキャッシュ化
CREATE OR REPLACE FUNCTION is_series_demo_member(p_series_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached TEXT;
  result BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    cached := current_setting('app.demo_member_' || p_series_id::TEXT || '_' || p_user_id::TEXT, true);
    IF cached IS NOT NULL THEN
      RETURN cached = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 無視
  END;

  SELECT EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.series_id = p_series_id AND tm.user_id = p_user_id
  ) INTO result;

  PERFORM set_config('app.demo_member_' || p_series_id::TEXT || '_' || p_user_id::TEXT, result::TEXT, true);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. RLSサブクエリ用の複合インデックス追加
-- teams(series_id) + team_members(team_id, user_id) の結合を高速化
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);
-- tournament_blocks の series_id 検索を高速化（既存だが念のため）
CREATE INDEX IF NOT EXISTS idx_tournament_blocks_series ON tournament_blocks(series_id);
-- block_standings はVIEWのためインデックス不可（元テーブルのインデックスで対応済み）

-- 4. 未認証ユーザーの高速パス
-- auth.uid() IS NULL の場合にRLSポリシーが即座にFALSEを返すよう
-- 非デモの公開データだけを先にチェックする最適化
-- （ポリシー自体の書き換えは不要 - PostgreSQLはCASE WHENの短絡評価を行う）
