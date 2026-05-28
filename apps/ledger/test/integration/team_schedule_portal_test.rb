require "test_helper"

class TeamSchedulePortalTest < ActionDispatch::IntegrationTest
  test "returns 404 for unknown schedule token" do
    get "/ja/schedule/does-not-exist"
    assert_response :not_found
  end

  test "shows portal page without authentication when token is valid" do
    match, home_team, _away_team = build_match_with_teams!
    home_team.regenerate_schedule_token!

    get "/ja/schedule/#{home_team.schedule_token}"

    assert_response :success
    assert_select "h1", text: /#{home_team.display_name}/
    assert_match match.home_team.display_name, response.body
  end

  test "creates candidate when posting valid form" do
    match, home_team, _away_team = build_match_with_teams!
    home_team.regenerate_schedule_token!

    assert_difference -> { match.schedule_candidates.count }, 1 do
      post "/ja/schedule/#{home_team.schedule_token}/matches/#{match.id}/candidates",
        params: {
          candidate: {
            starts_at: "2026-05-10T20:30",
            submitter_tz: "Asia/Tokyo",
            notes: "Captain prefers evenings"
          }
        }
    end

    assert_redirected_to "/ja/schedule/#{home_team.schedule_token}"
    candidate = match.schedule_candidates.order(:created_at).last
    assert_equal "Asia/Tokyo", candidate.submitter_tz
    assert_equal home_team.id, candidate.submitter_team_id
    assert_equal "proposed", candidate.status
  end

  test "withdraws own candidate" do
    match, home_team, _away_team = build_match_with_teams!
    home_team.regenerate_schedule_token!
    candidate = match.schedule_candidates.create!(
      submitter_team: home_team,
      starts_at: Time.utc(2026, 5, 10, 11, 30),
      submitter_tz: "Asia/Tokyo"
    )

    delete "/ja/schedule/#{home_team.schedule_token}/matches/#{match.id}/candidates/#{candidate.id}"

    assert_redirected_to "/ja/schedule/#{home_team.schedule_token}"
    assert_equal "withdrawn", candidate.reload.status
  end

  test "refuses to withdraw another team's candidate" do
    match, home_team, away_team = build_match_with_teams!
    home_team.regenerate_schedule_token!
    other_candidate = match.schedule_candidates.create!(
      submitter_team: away_team,
      starts_at: Time.utc(2026, 5, 10, 11, 30),
      submitter_tz: "Asia/Tokyo"
    )

    delete "/ja/schedule/#{home_team.schedule_token}/matches/#{match.id}/candidates/#{other_candidate.id}"

    assert_redirected_to "/ja/schedule/#{home_team.schedule_token}"
    assert_equal "proposed", other_candidate.reload.status
  end

  private

  def build_match_with_teams!
    organizer = OrganizerAccount.create!(
      display_name: "Portal Org",
      login_id: "portal-#{SecureRandom.hex(4)}",
      email: "portal-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Portal League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: "Home Portal Team")
    away_team = league.teams.create!(display_name: "Away Portal Team")
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
