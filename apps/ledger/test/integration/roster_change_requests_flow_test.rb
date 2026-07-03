require "test_helper"

class RosterChangeRequestsFlowTest < ActionDispatch::IntegrationTest
  setup do
    @password = "password"
    @organizer_account = OrganizerAccount.create!(
      display_name: "Roster Change Flow Organizer",
      login_id: "roster-change-flow-admin",
      email: "roster-change-flow-admin@example.com",
      password: @password
    )
    @owner = @organizer_account.organizer_members.create!(
      display_name: "Owner",
      role: "owner",
      active: true,
      admin_password: "1234"
    )
    @staff = @organizer_account.organizer_members.create!(
      display_name: "Staff",
      role: "staff",
      active: true
    )
    @league = @organizer_account.leagues.create!(
      name: "Roster Change Flow League",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    @team = @league.teams.create!(display_name: "Roster Change Flow Team")
    @participant = @team.participants.create!(league: @league, display_name: "Existing Player", member_ids: ["MD-1"])
  end

  test "owner can approve an add request and it creates a new participant" do
    login_as!(@organizer_account, password: @password, member: @owner)
    request = @team.roster_change_requests.create!(
      kind: "add",
      submitter_display_name: "Captain",
      proposed_display_name: "New Recruit",
      proposed_member_ids: ["MD-200"]
    )

    assert_difference("Participant.count", 1) do
      post approve_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request),
        params: { organizer_note: "looks good" }
    end

    assert_redirected_to league_team_roster_change_requests_path(locale: :ja, league_id: @league, team_id: @team)
    request.reload
    assert_equal "approved", request.status
    assert_equal @owner, request.reviewed_by
    assert_not_nil request.reviewed_at
    assert_equal "looks good", request.organizer_note

    new_participant = @team.participants.find_by!(display_name: "New Recruit")
    assert_equal ["MD-200"], new_participant.member_ids
    assert_equal "active", new_participant.status
  end

  test "owner can approve a remove request and it withdraws the participant" do
    login_as!(@organizer_account, password: @password, member: @owner)
    request = @team.roster_change_requests.create!(
      kind: "remove",
      submitter_display_name: "Captain",
      target_participant: @participant
    )

    post approve_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request)

    assert_redirected_to league_team_roster_change_requests_path(locale: :ja, league_id: @league, team_id: @team)
    assert_equal "withdrawn", @participant.reload.status
    assert_equal "approved", request.reload.status
  end

  test "owner can approve an update_md_id request and it updates member_ids" do
    login_as!(@organizer_account, password: @password, member: @owner)
    request = @team.roster_change_requests.create!(
      kind: "update_md_id",
      submitter_display_name: "Captain",
      target_participant: @participant,
      proposed_member_ids: ["MD-999"]
    )

    post approve_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request)

    assert_redirected_to league_team_roster_change_requests_path(locale: :ja, league_id: @league, team_id: @team)
    assert_equal ["MD-999"], @participant.reload.member_ids
    assert_equal "approved", request.reload.status
  end

  test "approve rolls back when applying the change fails validation" do
    login_as!(@organizer_account, password: @password, member: @owner)
    duplicate_request = @team.roster_change_requests.create!(
      kind: "update_md_id",
      submitter_display_name: "Captain",
      target_participant: @participant,
      proposed_member_ids: ["MD-DUP"]
    )
    @team.participants.create!(league: @league, display_name: "Other Player", member_ids: ["MD-DUP"])

    post approve_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: duplicate_request)

    assert_redirected_to league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: duplicate_request)
    follow_redirect!
    assert_response :success
    assert_equal "pending", duplicate_request.reload.status
    assert_equal ["MD-1"], @participant.reload.member_ids
  end

  test "owner can reject a request" do
    login_as!(@organizer_account, password: @password, member: @owner)
    request = @team.roster_change_requests.create!(
      kind: "add",
      submitter_display_name: "Captain",
      proposed_display_name: "Rejected Player"
    )

    assert_no_difference("Participant.count") do
      post reject_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request),
        params: { organizer_note: "not eligible" }
    end

    assert_redirected_to league_team_roster_change_requests_path(locale: :ja, league_id: @league, team_id: @team)
    request.reload
    assert_equal "rejected", request.status
    assert_equal @owner, request.reviewed_by
    assert_equal "not eligible", request.organizer_note
  end

  test "cannot re-review an already reviewed request" do
    login_as!(@organizer_account, password: @password, member: @owner)
    request = @team.roster_change_requests.create!(
      kind: "add",
      submitter_display_name: "Captain",
      proposed_display_name: "Already Reviewed"
    )
    request.update!(status: "approved", reviewed_by: @owner, reviewed_at: Time.current)

    assert_no_difference("Participant.count") do
      post approve_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request)
    end

    assert_redirected_to league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request)
    assert_equal "approved", request.reload.status
  end

  test "staff cannot access roster change requests" do
    login_as!(@organizer_account, password: @password, member: @staff)
    request = @team.roster_change_requests.create!(
      kind: "add",
      submitter_display_name: "Captain",
      proposed_display_name: "Blocked Player"
    )

    get league_team_roster_change_requests_path(locale: :ja, league_id: @league, team_id: @team), headers: {
      "HTTP_REFERER" => dashboard_path(locale: :ja)
    }

    assert_redirected_to dashboard_path(locale: :ja)

    post approve_league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request), headers: {
      "HTTP_REFERER" => dashboard_path(locale: :ja)
    }
    assert_redirected_to dashboard_path(locale: :ja)
    assert_equal "pending", request.reload.status
  end

  test "index and show render for organizer" do
    login_as!(@organizer_account, password: @password, member: @owner)
    request = @team.roster_change_requests.create!(
      kind: "remove",
      submitter_display_name: "Captain",
      target_participant: @participant
    )

    get league_team_roster_change_requests_path(locale: :ja, league_id: @league, team_id: @team)
    assert_response :success

    get league_team_roster_change_request_path(locale: :ja, league_id: @league, team_id: @team, id: request)
    assert_response :success
  end
end
