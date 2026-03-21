-- ============================================================
-- 033: League organizer members + audit log
-- ============================================================

-- --------------------------------------------
-- 1) League organizer members
-- --------------------------------------------
CREATE TABLE league_organizer_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, user_id)
);

CREATE INDEX idx_league_organizer_members_league ON league_organizer_members(league_id);
CREATE INDEX idx_league_organizer_members_user ON league_organizer_members(user_id);

CREATE TRIGGER update_league_organizer_members_updated_at
  BEFORE UPDATE ON league_organizer_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 2) League audit logs
-- --------------------------------------------
CREATE TABLE league_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields TEXT[],
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_league_audit_logs_league_created ON league_audit_logs(league_id, created_at DESC);
CREATE INDEX idx_league_audit_logs_actor ON league_audit_logs(actor_user_id, created_at DESC);

-- --------------------------------------------
-- 3) Permission helpers
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_league_organizer_role(p_league_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  IF p_league_id IS NULL OR p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    CASE
      WHEN l.organizer_id = p_user_id THEN 'owner'
      ELSE lom.role
    END
  INTO result
  FROM leagues l
  LEFT JOIN league_organizer_members lom
    ON lom.league_id = l.id
   AND lom.user_id = p_user_id
   AND lom.active = TRUE
  WHERE l.id = p_league_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_league_staff(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_league_organizer_role(p_league_id, p_user_id) IN ('owner', 'admin', 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_league_admin(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_league_organizer_role(p_league_id, p_user_id) IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_round_league_id(p_round_id UUID)
RETURNS UUID AS $$
  SELECT league_id FROM rounds WHERE id = p_round_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_match_league_id(p_match_id UUID)
RETURNS UUID AS $$
  SELECT r.league_id
  FROM matches m
  JOIN rounds r ON r.id = m.round_id
  WHERE m.id = p_match_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_team_league_id(p_team_id UUID)
RETURNS UUID AS $$
  SELECT COALESCE(t.league_id, r.league_id)
  FROM teams t
  LEFT JOIN rounds r ON r.id = t.round_id
  WHERE t.id = p_team_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------
-- 4) Audit helpers
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_league_id(p_table_name TEXT, p_row JSONB)
RETURNS UUID AS $$
DECLARE
  result UUID;
BEGIN
  CASE p_table_name
    WHEN 'leagues' THEN
      result := NULLIF(p_row->>'id', '')::UUID;
    WHEN 'league_organizer_members' THEN
      result := NULLIF(p_row->>'league_id', '')::UUID;
    WHEN 'rounds' THEN
      result := NULLIF(p_row->>'league_id', '')::UUID;
    WHEN 'round_blocks' THEN
      result := NULLIF(p_row->>'league_id', '')::UUID;
    WHEN 'team_applications' THEN
      result := NULLIF(p_row->>'league_id', '')::UUID;
    WHEN 'teams' THEN
      result := COALESCE(NULLIF(p_row->>'league_id', '')::UUID, get_round_league_id(NULLIF(p_row->>'round_id', '')::UUID));
    WHEN 'matches' THEN
      result := get_match_league_id(NULLIF(p_row->>'id', '')::UUID);
    WHEN 'team_entries' THEN
      result := get_round_league_id(NULLIF(p_row->>'round_id', '')::UUID);
    WHEN 'war_orders' THEN
      result := get_match_league_id(NULLIF(p_row->>'match_id', '')::UUID);
    WHEN 'war_rounds' THEN
      result := get_match_league_id(NULLIF(p_row->>'match_id', '')::UUID);
    WHEN 'individual_matches' THEN
      result := get_match_league_id(NULLIF(p_row->>'match_id', '')::UUID);
    ELSE
      result := NULL;
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_jsonb_changed_fields(p_before JSONB, p_after JSONB)
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::TEXT[])
  FROM (
    SELECT key
    FROM jsonb_object_keys(COALESCE(p_before, '{}'::JSONB) || COALESCE(p_after, '{}'::JSONB)) AS key
    WHERE COALESCE(p_before -> key, 'null'::JSONB) IS DISTINCT FROM COALESCE(p_after -> key, 'null'::JSONB)
  ) changed;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION log_league_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_row JSONB;
  v_league_id UUID;
  v_record_id UUID;
  v_changed_fields TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_row := v_after;
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_row := v_after;
  ELSE
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_row := v_before;
  END IF;

  v_league_id := get_audit_league_id(TG_TABLE_NAME, v_row);
  IF v_league_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_record_id := NULLIF(v_row->>'id', '')::UUID;
  v_changed_fields := CASE WHEN TG_OP = 'UPDATE' THEN get_jsonb_changed_fields(v_before, v_after) ELSE NULL END;

  INSERT INTO league_audit_logs (
    league_id,
    actor_user_id,
    table_name,
    record_id,
    action,
    changed_fields,
    before_data,
    after_data
  ) VALUES (
    v_league_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_changed_fields,
    v_before,
    v_after
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------
-- 5) RLS
-- --------------------------------------------
ALTER TABLE league_organizer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League organizer members are viewable by league staff"
  ON league_organizer_members FOR SELECT
  USING (is_league_staff(league_id, auth.uid()));

CREATE POLICY "League admins can add organizer members"
  ON league_organizer_members FOR INSERT
  WITH CHECK (is_league_admin(league_id, auth.uid()));

CREATE POLICY "League admins can update organizer members"
  ON league_organizer_members FOR UPDATE
  USING (is_league_admin(league_id, auth.uid()))
  WITH CHECK (is_league_admin(league_id, auth.uid()));

CREATE POLICY "League admins can delete organizer members"
  ON league_organizer_members FOR DELETE
  USING (is_league_admin(league_id, auth.uid()));

CREATE POLICY "League staff can view audit logs"
  ON league_audit_logs FOR SELECT
  USING (is_league_staff(league_id, auth.uid()));

CREATE POLICY "League members can view private leagues"
  ON leagues FOR SELECT
  USING (is_league_staff(leagues.id, auth.uid()));

CREATE POLICY "League admins can update leagues"
  ON leagues FOR UPDATE
  USING (is_league_admin(leagues.id, auth.uid()));

CREATE POLICY "League staff can view rounds"
  ON rounds FOR SELECT
  USING (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()));

CREATE POLICY "League staff can create rounds"
  ON rounds FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()))
      OR organizer_id = auth.uid()
    )
  );

CREATE POLICY "League staff can update rounds"
  ON rounds FOR UPDATE
  USING (
    organizer_id = auth.uid()
    OR (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()))
  )
  WITH CHECK (
    organizer_id = auth.uid()
    OR (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()))
  );

CREATE POLICY "League staff can delete rounds"
  ON rounds FOR DELETE
  USING (
    organizer_id = auth.uid()
    OR (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()))
  );

CREATE POLICY "League staff can view round blocks"
  ON round_blocks FOR SELECT
  USING (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()));

CREATE POLICY "League staff can manage round blocks"
  ON round_blocks FOR ALL
  USING (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()))
  WITH CHECK (league_id IS NOT NULL AND is_league_staff(league_id, auth.uid()));

CREATE POLICY "League staff can view team applications"
  ON team_applications FOR SELECT
  USING (is_league_staff(league_id, auth.uid()));

CREATE POLICY "League staff can update team applications"
  ON team_applications FOR UPDATE
  USING (is_league_staff(league_id, auth.uid()))
  WITH CHECK (is_league_staff(league_id, auth.uid()));

CREATE POLICY "League staff can view team entries"
  ON team_entries FOR SELECT
  USING (is_league_staff(get_round_league_id(round_id), auth.uid()));

CREATE POLICY "League staff can manage team entries"
  ON team_entries FOR ALL
  USING (is_league_staff(get_round_league_id(round_id), auth.uid()))
  WITH CHECK (is_league_staff(get_round_league_id(round_id), auth.uid()));

CREATE POLICY "League staff can view matches"
  ON matches FOR SELECT
  USING (is_league_staff(get_round_league_id(round_id), auth.uid()));

CREATE POLICY "League staff can manage matches"
  ON matches FOR ALL
  USING (is_league_staff(get_round_league_id(round_id), auth.uid()))
  WITH CHECK (is_league_staff(get_round_league_id(round_id), auth.uid()));

CREATE POLICY "League staff can view war orders"
  ON war_orders FOR SELECT
  USING (is_league_staff(get_match_league_id(match_id), auth.uid()));

CREATE POLICY "League staff can manage war orders"
  ON war_orders FOR ALL
  USING (is_league_staff(get_match_league_id(match_id), auth.uid()))
  WITH CHECK (is_league_staff(get_match_league_id(match_id), auth.uid()));

CREATE POLICY "League staff can view war rounds"
  ON war_rounds FOR SELECT
  USING (is_league_staff(get_match_league_id(match_id), auth.uid()));

CREATE POLICY "League staff can manage war rounds"
  ON war_rounds FOR ALL
  USING (is_league_staff(get_match_league_id(match_id), auth.uid()))
  WITH CHECK (is_league_staff(get_match_league_id(match_id), auth.uid()));

CREATE POLICY "League staff can view individual matches"
  ON individual_matches FOR SELECT
  USING (is_league_staff(get_match_league_id(match_id), auth.uid()));

CREATE POLICY "League staff can manage individual matches"
  ON individual_matches FOR ALL
  USING (is_league_staff(get_match_league_id(match_id), auth.uid()))
  WITH CHECK (is_league_staff(get_match_league_id(match_id), auth.uid()));

-- --------------------------------------------
-- 6) Audit triggers
-- --------------------------------------------
DROP TRIGGER IF EXISTS audit_leagues ON leagues;
CREATE TRIGGER audit_leagues
  AFTER INSERT OR UPDATE OR DELETE ON leagues
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_league_organizer_members ON league_organizer_members;
CREATE TRIGGER audit_league_organizer_members
  AFTER INSERT OR UPDATE OR DELETE ON league_organizer_members
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_rounds ON rounds;
CREATE TRIGGER audit_rounds
  AFTER INSERT OR UPDATE OR DELETE ON rounds
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_round_blocks ON round_blocks;
CREATE TRIGGER audit_round_blocks
  AFTER INSERT OR UPDATE OR DELETE ON round_blocks
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_matches ON matches;
CREATE TRIGGER audit_matches
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_team_applications ON team_applications;
CREATE TRIGGER audit_team_applications
  AFTER INSERT OR UPDATE OR DELETE ON team_applications
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_team_entries ON team_entries;
CREATE TRIGGER audit_team_entries
  AFTER INSERT OR UPDATE OR DELETE ON team_entries
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_war_orders ON war_orders;
CREATE TRIGGER audit_war_orders
  AFTER INSERT OR UPDATE OR DELETE ON war_orders
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_war_rounds ON war_rounds;
CREATE TRIGGER audit_war_rounds
  AFTER INSERT OR UPDATE OR DELETE ON war_rounds
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();

DROP TRIGGER IF EXISTS audit_individual_matches ON individual_matches;
CREATE TRIGGER audit_individual_matches
  AFTER INSERT OR UPDATE OR DELETE ON individual_matches
  FOR EACH ROW EXECUTE FUNCTION log_league_audit_event();
