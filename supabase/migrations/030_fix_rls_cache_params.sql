-- ============================================
-- 030: RLSキャッシュ関数のパラメータ名修正
-- PostgreSQLのcustom parameter nameは
-- "namespace.name" 形式のみ有効（ハイフン不可）
-- UUIDをそのままキーに使えないため、
-- キャッシュ方式をシンプルな変数に変更
-- ============================================

-- is_demo_user: セッション中1回だけチェックし結果をキャッシュ
CREATE OR REPLACE FUNCTION is_demo_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached TEXT;
  result BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- セッション変数からキャッシュを取得（ユーザーIDは同一リクエスト内で不変）
  BEGIN
    cached := current_setting('app.demo_user_cache', true);
    IF cached = 'true' THEN RETURN TRUE; END IF;
    IF cached = 'false' THEN RETURN FALSE; END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email LIKE '%@katorin2.codenica.dev'
  ) INTO result;

  PERFORM set_config('app.demo_user_cache', result::TEXT, true);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- is_series_demo_member: series_id ごとにキャッシュ（簡易版: 最後のチェック結果のみ保持）
CREATE OR REPLACE FUNCTION is_series_demo_member(p_series_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached_sid TEXT;
  cached_result TEXT;
  result BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 同じseries_idの結果がキャッシュされていれば返す
  BEGIN
    cached_sid := current_setting('app.demo_member_sid', true);
    cached_result := current_setting('app.demo_member_val', true);
    IF cached_sid = p_series_id::TEXT AND cached_result IS NOT NULL THEN
      RETURN cached_result = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.series_id = p_series_id AND tm.user_id = p_user_id
  ) INTO result;

  PERFORM set_config('app.demo_member_sid', p_series_id::TEXT, true);
  PERFORM set_config('app.demo_member_val', result::TEXT, true);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
