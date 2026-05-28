require "test_helper"

class MatchSchedules::AcceptorTest < ActiveSupport::TestCase
  test "accepts candidate, writes back scheduled_on/time in JST, and withdraws others" do
    match, home_team, away_team = build_match_with_teams!
    accepted = match.schedule_candidates.create!(
      submitter_team: home_team,
      starts_at: Time.utc(2026, 5, 10, 11, 30),
      submitter_tz: "Asia/Tokyo"
    )
    other = match.schedule_candidates.create!(
      submitter_team: away_team,
      starts_at: Time.utc(2026, 5, 11, 13, 0),
      submitter_tz: "Asia/Tokyo"
    )

    MatchSchedules::Acceptor.new(match.reload, accepted).accept!

    assert_equal accepted.id, match.reload.accepted_schedule_candidate_id
    assert_equal "accepted", accepted.reload.status
    assert_equal "withdrawn", other.reload.status
    assert_equal Date.new(2026, 5, 10), match.scheduled_on
    assert_equal "20:30", match.scheduled_time.strftime("%H:%M")
  end

  test "raises NotEligibleError when candidate does not belong to match" do
    match, home_team, _away_team = build_match_with_teams!
    other_match, _, _ = build_match_with_teams!
    foreign_candidate = other_match.schedule_candidates.create!(
      submitter_team: other_match.home_team,
      starts_at: Time.current,
      submitter_tz: "Asia/Tokyo"
    )

    assert_raises(MatchSchedules::Acceptor::NotEligibleError) do
      MatchSchedules::Acceptor.new(match, foreign_candidate).accept!
    end
  end

  test "raises NotEligibleError when candidate already withdrawn" do
    match, home_team, _away_team = build_match_with_teams!
    candidate = match.schedule_candidates.create!(
      submitter_team: home_team,
      starts_at: Time.current,
      submitter_tz: "Asia/Tokyo",
      status: "withdrawn"
    )

    assert_raises(MatchSchedules::Acceptor::NotEligibleError) do
      MatchSchedules::Acceptor.new(match, candidate).accept!
    end
  end

  private

  def build_match_with_teams!
    organizer = OrganizerAccount.create!(
      display_name: "Acc Org",
      login_id: "acc-#{SecureRandom.hex(4)}",
      email: "acc-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Acc League #{SecureRandom.hex(4)}",
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
