-- ============================================================
-- 032: League system rename (Phase 1)
-- series -> leagues, tournaments -> rounds
-- ============================================================

-- ------------------------------------------------------------
-- 0) Backup + drop all current public RLS policies
--    (equivalent to: SELECT policyname, tablename FROM pg_policies ...)
-- ------------------------------------------------------------
CREATE TEMP TABLE _policy_backup AS
SELECT
  policyname,
  tablename,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public';

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 1) Drop objects that depend on old names
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS tournament_completed_auto_points ON tournaments;
DROP FUNCTION IF EXISTS trigger_auto_calculate_series_points();
DROP FUNCTION IF EXISTS calculate_series_points(UUID);

DROP TRIGGER IF EXISTS set_demo_flag_series ON series;
DROP TRIGGER IF EXISTS set_demo_flag_tournaments ON tournaments;

DROP VIEW IF EXISTS block_standings;
DROP VIEW IF EXISTS swiss_rankings;

-- ------------------------------------------------------------
-- 2) Table renames
-- ------------------------------------------------------------
ALTER TABLE series RENAME TO leagues;
ALTER TABLE tournaments RENAME TO rounds;
ALTER TABLE tournament_blocks RENAME TO round_blocks;
ALTER TABLE series_points RENAME TO league_points;

-- ------------------------------------------------------------
-- 3) Column renames
-- ------------------------------------------------------------
ALTER TABLE leagues RENAME COLUMN series_config TO league_config;

ALTER TABLE rounds RENAME COLUMN series_id TO league_id;
ALTER TABLE rounds RENAME COLUMN round_number TO round_order;
ALTER TABLE rounds RENAME COLUMN tournament_format TO format;

ALTER TABLE round_blocks RENAME COLUMN tournament_id TO round_id;
ALTER TABLE round_blocks RENAME COLUMN series_id TO league_id;

ALTER TABLE league_points RENAME COLUMN series_id TO league_id;
ALTER TABLE league_points RENAME COLUMN tournament_id TO round_id;

ALTER TABLE participants RENAME COLUMN tournament_id TO round_id;
ALTER TABLE matches RENAME COLUMN tournament_id TO round_id;
ALTER TABLE team_entries RENAME COLUMN tournament_id TO round_id;
ALTER TABLE team_applications RENAME COLUMN series_id TO league_id;
ALTER TABLE teams RENAME COLUMN series_id TO league_id;
ALTER TABLE teams RENAME COLUMN tournament_id TO round_id;
ALTER TABLE tournament_invites RENAME COLUMN tournament_id TO round_id;
ALTER TABLE swiss_standings RENAME COLUMN tournament_id TO round_id;

-- ------------------------------------------------------------
-- 4) New columns
-- ------------------------------------------------------------
ALTER TABLE rounds ADD COLUMN is_finals BOOLEAN DEFAULT FALSE;
ALTER TABLE rounds ADD COLUMN source_round_id UUID REFERENCES rounds(id);
ALTER TABLE rounds ADD COLUMN qualified_per_block INTEGER;
ALTER TABLE rounds ADD COLUMN qualified_total INTEGER;

ALTER TABLE matches ADD COLUMN is_forfeit BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN is_bye BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------
-- 5) Constraint name refresh (FK/PK/UNIQUE/CHECK)
-- ------------------------------------------------------------
DO $$
DECLARE
  c RECORD;
  v_new_name TEXT;
BEGIN
  FOR c IN
    SELECT
      con.conname,
      con.conrelid::regclass AS relname,
      con.conrelid
    FROM pg_constraint con
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE nsp.nspname = 'public'
      AND con.contype IN ('f', 'p', 'u', 'c')
  LOOP
    v_new_name := c.conname;
    v_new_name := replace(v_new_name, 'series_points', 'league_points');
    v_new_name := replace(v_new_name, 'tournament_blocks', 'round_blocks');
    v_new_name := replace(v_new_name, 'tournaments', 'rounds');
    v_new_name := replace(v_new_name, 'series', 'leagues');
    v_new_name := replace(v_new_name, 'tournament_id', 'round_id');
    v_new_name := replace(v_new_name, 'series_id', 'league_id');

    IF v_new_name <> c.conname
       AND NOT EXISTS (
         SELECT 1
         FROM pg_constraint c2
         WHERE c2.conrelid = c.conrelid
           AND c2.conname = v_new_name
       ) THEN
      EXECUTE format(
        'ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
        c.relname,
        c.conname,
        v_new_name
      );
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 6) Index refresh (drop old names -> create new names)
-- ------------------------------------------------------------
DROP INDEX IF EXISTS idx_series_organizer;
DROP INDEX IF EXISTS idx_series_status;
DROP INDEX IF EXISTS idx_series_visibility_status;

DROP INDEX IF EXISTS idx_tournaments_organizer;
DROP INDEX IF EXISTS idx_tournaments_status;
DROP INDEX IF EXISTS idx_tournaments_visibility_status;
DROP INDEX IF EXISTS idx_tournaments_start_at;
DROP INDEX IF EXISTS idx_tournaments_entry_deadline;
DROP INDEX IF EXISTS idx_tournaments_series;
DROP INDEX IF EXISTS idx_tournaments_round;
DROP INDEX IF EXISTS idx_tournaments_demo;

DROP INDEX IF EXISTS idx_tournament_blocks_tournament;
DROP INDEX IF EXISTS idx_tournament_blocks_series;

DROP INDEX IF EXISTS idx_series_points_series;
DROP INDEX IF EXISTS idx_series_points_tournament;
DROP INDEX IF EXISTS idx_series_points_team;

DROP INDEX IF EXISTS idx_participants_tournament;
DROP INDEX IF EXISTS idx_participants_seed;
DROP INDEX IF EXISTS idx_participants_checked_in;

DROP INDEX IF EXISTS idx_matches_tournament;
DROP INDEX IF EXISTS idx_matches_tournament_round;

DROP INDEX IF EXISTS idx_team_entries_tournament;
DROP INDEX IF EXISTS idx_teams_series;
DROP INDEX IF EXISTS idx_teams_tournament;

DROP INDEX IF EXISTS idx_team_applications_series;
DROP INDEX IF EXISTS idx_team_applications_status;

DROP INDEX IF EXISTS idx_tournament_invites_tournament;

DROP INDEX IF EXISTS idx_swiss_standings_tournament;
DROP INDEX IF EXISTS idx_swiss_standings_ranking;

CREATE INDEX IF NOT EXISTS idx_leagues_organizer ON leagues(organizer_id);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);
CREATE INDEX IF NOT EXISTS idx_leagues_visibility_status ON leagues(visibility, status);

CREATE INDEX IF NOT EXISTS idx_rounds_organizer ON rounds(organizer_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_visibility_status ON rounds(visibility, status);
CREATE INDEX IF NOT EXISTS idx_rounds_start_at ON rounds(start_at);
CREATE INDEX IF NOT EXISTS idx_rounds_entry_deadline ON rounds(entry_deadline);
CREATE INDEX IF NOT EXISTS idx_rounds_league ON rounds(league_id);
CREATE INDEX IF NOT EXISTS idx_rounds_order ON rounds(league_id, round_order);
CREATE INDEX IF NOT EXISTS idx_rounds_demo ON rounds(is_demo);
CREATE INDEX IF NOT EXISTS idx_rounds_source_round ON rounds(source_round_id);

CREATE INDEX IF NOT EXISTS idx_round_blocks_round ON round_blocks(round_id);
CREATE INDEX IF NOT EXISTS idx_round_blocks_league ON round_blocks(league_id);

CREATE INDEX IF NOT EXISTS idx_league_points_league ON league_points(league_id);
CREATE INDEX IF NOT EXISTS idx_league_points_round ON league_points(round_id);
CREATE INDEX IF NOT EXISTS idx_league_points_team ON league_points(team_id);

CREATE INDEX IF NOT EXISTS idx_participants_round ON participants(round_id);
CREATE INDEX IF NOT EXISTS idx_participants_seed ON participants(round_id, seed);
CREATE INDEX IF NOT EXISTS idx_participants_checked_in ON participants(round_id, checked_in_at);

CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_round_round ON matches(round_id, round);

CREATE INDEX IF NOT EXISTS idx_team_entries_round ON team_entries(round_id);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_round ON teams(round_id);

CREATE INDEX IF NOT EXISTS idx_team_applications_league ON team_applications(league_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_league_status ON team_applications(league_id, status);

CREATE INDEX IF NOT EXISTS idx_tournament_invites_round ON tournament_invites(round_id);

CREATE INDEX IF NOT EXISTS idx_swiss_standings_round ON swiss_standings(round_id);
CREATE INDEX IF NOT EXISTS idx_swiss_standings_ranking ON swiss_standings(round_id, round, team_points DESC, win_points DESC);

-- ------------------------------------------------------------
-- 7) Function / trigger updates
-- ------------------------------------------------------------

-- keep latest definition style from 030 (cached session var)
CREATE OR REPLACE FUNCTION is_demo_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached TEXT;
  result BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

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

DROP FUNCTION IF EXISTS is_series_demo_member(UUID, UUID);
CREATE OR REPLACE FUNCTION is_league_demo_member(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached_lid TEXT;
  cached_result TEXT;
  result BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    cached_lid := current_setting('app.demo_member_lid', true);
    cached_result := current_setting('app.demo_member_val', true);
    IF cached_lid = p_league_id::TEXT AND cached_result IS NOT NULL THEN
      RETURN cached_result = 'true';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT EXISTS (
    SELECT 1
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.league_id = p_league_id
      AND tm.user_id = p_user_id
  ) INTO result;

  PERFORM set_config('app.demo_member_lid', p_league_id::TEXT, true);
  PERFORM set_config('app.demo_member_val', result::TEXT, true);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_team_visible(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t WHERE t.id = p_team_id AND (
      CASE WHEN is_demo_user(p_user_id) THEN
        EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = t.league_id
            AND l.is_demo
            AND (l.organizer_id = p_user_id OR is_league_demo_member(l.id, p_user_id))
        )
        OR EXISTS (
          SELECT 1 FROM rounds r
          WHERE r.id = t.round_id
            AND r.is_demo
            AND (r.organizer_id = p_user_id OR is_league_demo_member(r.league_id, p_user_id))
        )
        OR t.leader_id = p_user_id
      ELSE
        EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = t.league_id
            AND NOT l.is_demo
            AND l.visibility = 'public'
        )
        OR EXISTS (
          SELECT 1 FROM rounds r
          WHERE r.id = t.round_id
            AND NOT r.is_demo
            AND r.visibility = 'public'
        )
        OR t.leader_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = t.league_id
            AND l.organizer_id = p_user_id
        )
        OR EXISTS (
          SELECT 1 FROM rounds r
          WHERE r.id = t.round_id
            AND r.organizer_id = p_user_id
        )
      END
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION calculate_league_points(p_round_id UUID)
RETURNS void AS $$
DECLARE
  v_league_id UUID;
  v_win_points INTEGER;
  v_loss_points INTEGER;
  r_standing RECORD;
BEGIN
  SELECT r.league_id INTO v_league_id
  FROM rounds r
  WHERE r.id = p_round_id;

  IF v_league_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE((l.league_config->'scoring'->>'winPoints')::INTEGER, 3),
    COALESCE((l.league_config->'scoring'->>'lossPoints')::INTEGER, 0)
  INTO v_win_points, v_loss_points
  FROM leagues l
  WHERE l.id = v_league_id;

  DELETE FROM league_points
  WHERE league_id = v_league_id
    AND round_id = p_round_id;

  FOR r_standing IN
    EXECUTE
      'SELECT team_id, wins, losses, round_diff, match_diff, total_rounds_won
         FROM round_block_standings
        WHERE round_id = $1'
      USING p_round_id
  LOOP
    INSERT INTO league_points (
      league_id,
      round_id,
      team_id,
      points,
      wins,
      losses,
      round_diff,
      match_diff,
      total_rounds_won
    ) VALUES (
      v_league_id,
      p_round_id,
      r_standing.team_id,
      (r_standing.wins * v_win_points) + (r_standing.losses * v_loss_points),
      r_standing.wins,
      r_standing.losses,
      r_standing.round_diff,
      r_standing.match_diff,
      r_standing.total_rounds_won
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_auto_calculate_league_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS NULL OR OLD.status <> 'completed')
     AND NEW.league_id IS NOT NULL THEN
    PERFORM calculate_league_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS round_completed_auto_points ON rounds;
CREATE TRIGGER round_completed_auto_points
  AFTER UPDATE ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_calculate_league_points();

-- demo flag triggers on renamed tables
CREATE TRIGGER set_demo_flag_leagues
  BEFORE INSERT ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_demo_flag();

CREATE TRIGGER set_demo_flag_rounds
  BEFORE INSERT ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_demo_flag();

-- keep trigger names aligned after table rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class rel ON rel.oid = tr.tgrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'leagues' AND tr.tgname = 'update_series_updated_at'
  ) THEN
    EXECUTE 'ALTER TRIGGER update_series_updated_at ON leagues RENAME TO update_leagues_updated_at';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class rel ON rel.oid = tr.tgrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'rounds' AND tr.tgname = 'update_tournaments_updated_at'
  ) THEN
    EXECUTE 'ALTER TRIGGER update_tournaments_updated_at ON rounds RENAME TO update_rounds_updated_at';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class rel ON rel.oid = tr.tgrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'league_points' AND tr.tgname = 'update_series_points_updated_at'
  ) THEN
    EXECUTE 'ALTER TRIGGER update_series_points_updated_at ON league_points RENAME TO update_league_points_updated_at';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 8) View rebuild
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW round_block_standings AS
WITH match_results AS (
  SELECT
    m.round_id,
    m.block_id,
    m.team1_id AS team_id,
    CASE WHEN m.winner_team_id = m.team1_id THEN 3 ELSE 0 END AS win_points,
    m.team1_round_wins AS rounds_won,
    m.team2_round_wins AS rounds_lost,
    m.team1_wins AS matches_won,
    m.team2_wins AS matches_lost
  FROM matches m
  WHERE m.status = 'completed'
    AND m.team1_id IS NOT NULL

  UNION ALL

  SELECT
    m.round_id,
    m.block_id,
    m.team2_id AS team_id,
    CASE WHEN m.winner_team_id = m.team2_id THEN 3 ELSE 0 END AS win_points,
    m.team2_round_wins AS rounds_won,
    m.team1_round_wins AS rounds_lost,
    m.team2_wins AS matches_won,
    m.team1_wins AS matches_lost
  FROM matches m
  WHERE m.status = 'completed'
    AND m.team2_id IS NOT NULL
)
SELECT
  mr.round_id,
  mr.block_id,
  mr.team_id,
  t.name AS team_name,
  t.avatar_url AS team_avatar_url,
  COUNT(*) AS matches_played,
  COUNT(*) FILTER (WHERE mr.win_points = 3) AS wins,
  COUNT(*) FILTER (WHERE mr.win_points = 0) AS losses,
  SUM(mr.win_points) AS total_win_points,
  SUM(mr.rounds_won) - SUM(mr.rounds_lost) AS round_diff,
  SUM(mr.matches_won) - SUM(mr.matches_lost) AS match_diff,
  SUM(mr.rounds_won) AS total_rounds_won,
  RANK() OVER (
    PARTITION BY mr.round_id, mr.block_id
    ORDER BY
      SUM(mr.win_points) DESC,
      SUM(mr.rounds_won) - SUM(mr.rounds_lost) DESC,
      SUM(mr.matches_won) - SUM(mr.matches_lost) DESC,
      SUM(mr.rounds_won) DESC
  ) AS rank
FROM match_results mr
JOIN teams t ON t.id = mr.team_id
GROUP BY mr.round_id, mr.block_id, mr.team_id, t.name, t.avatar_url;

CREATE OR REPLACE VIEW round_swiss_rankings AS
SELECT
  ss.round_id,
  ss.team_id,
  t.name AS team_name,
  t.avatar_url AS team_avatar_url,
  SUM(ss.team_points) AS total_team_points,
  SUM(ss.win_points) AS total_win_points,
  MAX(ss.round) AS rounds_played,
  COUNT(*) FILTER (WHERE ss.is_bye) AS bye_count,
  RANK() OVER (
    PARTITION BY ss.round_id
    ORDER BY SUM(ss.team_points) DESC, SUM(ss.win_points) DESC
  ) AS rank
FROM swiss_standings ss
JOIN teams t ON t.id = ss.team_id
GROUP BY ss.round_id, ss.team_id, t.name, t.avatar_url;

-- ------------------------------------------------------------
-- 9) Recreate all public RLS policies with renamed table/column refs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.rename_policy_text(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v TEXT := p_text;
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;

  v := replace(v, 'is_series_demo_member', 'is_league_demo_member');
  v := replace(v, 'series_config', 'league_config');
  v := replace(v, 'tournament_id', 'round_id');
  v := replace(v, 'series_id', 'league_id');
  v := replace(v, 'series_points', 'league_points');
  v := replace(v, 'tournament_blocks', 'round_blocks');
  v := replace(v, 'block_standings', 'round_block_standings');
  v := replace(v, 'swiss_rankings', 'round_swiss_rankings');
  v := replace(v, 'tournaments', 'rounds');
  v := replace(v, 'series', 'leagues');
  v := replace(v, 'round_number', 'round_order');
  v := replace(v, 'tournament_format', 'format');

  RETURN v;
END;
$$;

DO $$
DECLARE
  p RECORD;
  v_table TEXT;
  v_qual TEXT;
  v_with_check TEXT;
  v_roles TEXT;
  v_sql TEXT;
BEGIN
  FOR p IN
    SELECT *
    FROM _policy_backup
    ORDER BY tablename, policyname
  LOOP
    v_table := CASE p.tablename
      WHEN 'series' THEN 'leagues'
      WHEN 'tournaments' THEN 'rounds'
      WHEN 'tournament_blocks' THEN 'round_blocks'
      WHEN 'series_points' THEN 'league_points'
      ELSE p.tablename
    END;

    v_qual := pg_temp.rename_policy_text(p.qual);
    v_with_check := pg_temp.rename_policy_text(p.with_check);

    SELECT string_agg(
      CASE
        WHEN role_name = 'public' THEN 'PUBLIC'
        ELSE quote_ident(role_name)
      END,
      ', '
    )
    INTO v_roles
    FROM unnest(p.roles) AS role_name;

    IF v_roles IS NULL THEN
      v_roles := 'PUBLIC';
    END IF;

    v_sql := format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      p.policyname,
      v_table,
      p.permissive,
      p.cmd,
      v_roles
    );

    IF v_qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;

    IF v_with_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_with_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 10) Clean up compatibility leftovers (old function names)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS calculate_series_points(UUID);
DROP FUNCTION IF EXISTS trigger_auto_calculate_series_points();

-- End of migration.
