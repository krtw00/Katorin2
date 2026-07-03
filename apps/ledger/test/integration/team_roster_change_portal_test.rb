require "test_helper"

class TeamRosterChangePortalTest < ActionDispatch::IntegrationTest
  test "returns 404 for unknown roster change token" do
    get "/ja/roster/does-not-exist"
    assert_response :not_found
  end

  test "shows portal page without authentication when token is valid" do
    team = build_team_with_members!
    team.regenerate_roster_change_token!

    get "/ja/roster/#{team.roster_change_token}"

    assert_response :success
    assert_select "h1", text: /#{team.display_name}/
    assert_match team.participants.first.display_name, response.body
  end

  test "creates an add request when posting valid form" do
    team = build_team_with_members!
    team.regenerate_roster_change_token!

    assert_difference -> { team.roster_change_requests.count }, 1 do
      post "/ja/roster/#{team.roster_change_token}/requests",
        params: {
          roster_change_request: {
            kind: "add",
            submitter_display_name: "Captain",
            proposed_display_name: "New Recruit",
            proposed_member_ids: ["MD-100", "", ""]
          }
        }
    end

    assert_redirected_to "/ja/roster/#{team.roster_change_token}"
    request = team.roster_change_requests.order(:created_at).last
    assert_equal "add", request.kind
    assert_equal "pending", request.status
    assert_equal "New Recruit", request.proposed_display_name
    assert_equal ["MD-100"], request.proposed_member_ids
  end

  test "renders validation errors with 422 when the request is invalid" do
    team = build_team_with_members!
    team.regenerate_roster_change_token!

    assert_no_difference -> { team.roster_change_requests.count } do
      post "/ja/roster/#{team.roster_change_token}/requests",
        params: {
          roster_change_request: {
            kind: "add",
            submitter_display_name: "Captain",
            proposed_display_name: ""
          }
        }
    end

    assert_response :unprocessable_entity
    assert_includes response.body, team.display_name
  end

  test "shows request history with status" do
    team = build_team_with_members!
    team.regenerate_roster_change_token!
    team.roster_change_requests.create!(
      kind: "add",
      submitter_display_name: "Captain",
      proposed_display_name: "Historic Player"
    )

    get "/ja/roster/#{team.roster_change_token}"

    assert_response :success
    assert_includes response.body, "Historic Player"
    assert_includes response.body, "Captain"
  end

  private

  def build_team_with_members!
    organizer = OrganizerAccount.create!(
      display_name: "Roster Portal Org",
      login_id: "roster-portal-#{SecureRandom.hex(4)}",
      email: "roster-portal-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Roster Portal League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    team = league.teams.create!(display_name: "Roster Portal Team")
    team.participants.create!(league: league, display_name: "Existing Player", member_ids: ["MD-1"])
    team
  end
end
