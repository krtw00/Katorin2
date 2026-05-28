require "test_helper"

class MatchExports::NotifyDiscordJobTest < ActiveJob::TestCase
  test "discards when match record missing" do
    assert_nothing_raised do
      MatchExports::NotifyDiscordJob.perform_now(SecureRandom.uuid)
    end
  end

  test "no-ops when match has no webhook URL configured" do
    match = build_minimal_match!
    assert_nothing_raised do
      MatchExports::NotifyDiscordJob.perform_now(match.id)
    end
    assert_nil match.reload.discord_notified_at
  end

  private

  def build_minimal_match!
    organizer = OrganizerAccount.create!(
      display_name: "Job Test",
      login_id: "job-#{SecureRandom.hex(4)}",
      email: "job-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Job League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: "H")
    away_team = league.teams.create!(display_name: "A")
    week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      status: "scheduled"
    )
  end
end
