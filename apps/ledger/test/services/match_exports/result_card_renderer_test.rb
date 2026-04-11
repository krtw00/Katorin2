require "test_helper"

class MatchExports::ResultCardRendererTest < ActiveSupport::TestCase
  test "versus header uses VS label" do
    organizer = OrganizerAccount.create!(
      display_name: "Renderer Organizer",
      login_id: "renderer-org",
      email: "renderer@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Renderer League",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: "Alpha Team")
    away_team = league.teams.create!(display_name: "Beta Team")
    match = week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      scheduled_on: Date.new(2026, 4, 11),
      scheduled_time: Time.zone.parse("20:00"),
      status: "scheduled"
    )

    html = MatchExports::ResultCardRenderer.new(match).send(:versus_html)

    assert_includes html, ">VS<"
    assert_not_includes html, ">対<"
  end
end
