require "test_helper"

class MatchScheduleCandidateTest < ActiveSupport::TestCase
  test "requires starts_at and submitter_tz and a valid status" do
    match, home_team, _away_team = build_match_with_teams!
    candidate = match.schedule_candidates.build(submitter_team: home_team, starts_at: nil, submitter_tz: nil)

    refute candidate.valid?
    assert_includes candidate.errors[:starts_at], "を入力してください。"
    assert_includes candidate.errors[:submitter_tz], "を入力してください。"
  end

  test "rejects non-IANA submitter_tz" do
    match, home_team, _away_team = build_match_with_teams!
    candidate = match.schedule_candidates.build(
      submitter_team: home_team,
      starts_at: Time.current,
      submitter_tz: "Not/A_TZ"
    )

    refute candidate.valid?
    assert candidate.errors[:submitter_tz].any?
  end

  test "rejects submitter_team that is not in the match" do
    match, _home_team, _away_team = build_match_with_teams!
    foreign_team = match.league.teams.create!(display_name: "Outsider")
    candidate = match.schedule_candidates.build(
      submitter_team: foreign_team,
      starts_at: Time.current,
      submitter_tz: "Asia/Tokyo"
    )

    refute candidate.valid?
    assert candidate.errors[:submitter_team_id].any?
  end

  test "starts_at_in_submitter_tz returns time in submitter_tz" do
    match, home_team, _away_team = build_match_with_teams!
    utc_time = Time.utc(2026, 5, 1, 12, 0, 0)
    candidate = match.schedule_candidates.create!(
      submitter_team: home_team,
      starts_at: utc_time,
      submitter_tz: "Asia/Tokyo"
    )

    result = candidate.starts_at_in_submitter_tz
    assert_equal "Asia/Tokyo", result.time_zone.name
    assert_equal 21, result.hour
  end

  private

  def build_match_with_teams!
    organizer = OrganizerAccount.create!(
      display_name: "Cand Org",
      login_id: "cand-#{SecureRandom.hex(4)}",
      email: "cand-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Cand League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: "Home")
    away_team = league.teams.create!(display_name: "Away")
    match = week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      status: "scheduled"
    )
    [match, home_team, away_team]
  end
end
