require "test_helper"

class RosterChangeRequestTest < ActiveSupport::TestCase
  setup do
    organizer_account = OrganizerAccount.create!(
      email: "roster-change-request-test@example.com",
      login_id: "roster-change-request-test",
      password: "password",
      display_name: "Roster Change Request Test"
    )
    @league = organizer_account.leagues.create!(
      name: "Roster Change Request Test League",
      started_at: Date.new(2026, 3, 23)
    )
    @team = @league.teams.create!(display_name: "Test Team")
    @other_team = @league.teams.create!(display_name: "Other Team")
    @participant = @team.participants.create!(league: @league, display_name: "Existing Player")
    @other_team_participant = @other_team.participants.create!(league: @league, display_name: "Other Team Player")
  end

  test "requires submitter_display_name for every kind" do
    request = @team.roster_change_requests.new(kind: "add", proposed_display_name: "New Player")
    assert_not request.save
    assert request.errors.of_kind?(:submitter_display_name, :blank)
  end

  test "add requires proposed_display_name" do
    request = build_request(kind: "add", submitter_display_name: "Captain")
    assert_not request.save
    assert request.errors.of_kind?(:proposed_display_name, :blank)
  end

  test "add succeeds with proposed_display_name" do
    request = build_request(kind: "add", submitter_display_name: "Captain", proposed_display_name: "New Player")
    assert request.save
  end

  test "remove requires target_participant_id" do
    request = build_request(kind: "remove", submitter_display_name: "Captain")
    assert_not request.save
    assert request.errors.of_kind?(:target_participant_id, :blank)
  end

  test "remove succeeds with a target_participant from the same team" do
    request = build_request(kind: "remove", submitter_display_name: "Captain", target_participant: @participant)
    assert request.save
  end

  test "update_md_id requires target_participant_id" do
    request = build_request(kind: "update_md_id", submitter_display_name: "Captain", proposed_member_ids: ["MD-1"])
    assert_not request.save
    assert request.errors.of_kind?(:target_participant_id, :blank)
  end

  test "update_md_id requires proposed_member_ids" do
    request = build_request(kind: "update_md_id", submitter_display_name: "Captain", target_participant: @participant)
    assert_not request.save
    assert request.errors.of_kind?(:proposed_member_ids, :blank)
  end

  test "update_md_id succeeds with target_participant and proposed_member_ids" do
    request = build_request(
      kind: "update_md_id",
      submitter_display_name: "Captain",
      target_participant: @participant,
      proposed_member_ids: ["MD-1", "MD-2"]
    )
    assert request.save
  end

  test "rejects target_participant that belongs to another team" do
    request = build_request(kind: "remove", submitter_display_name: "Captain", target_participant: @other_team_participant)
    assert_not request.save
    assert request.errors.of_kind?(:target_participant_id, :not_in_team)
  end

  test "rejects proposed_member_ids beyond the max limit" do
    request = build_request(
      kind: "update_md_id",
      submitter_display_name: "Captain",
      target_participant: @participant,
      proposed_member_ids: %w[MD-1 MD-2 MD-3 MD-4]
    )
    assert_not request.save
    assert request.errors.of_kind?(:proposed_member_ids, :too_many)
  end

  test "recent_first orders by created_at descending" do
    older = build_request(kind: "add", submitter_display_name: "Captain", proposed_display_name: "Older")
    older.save!
    older.update_column(:created_at, 1.day.ago)
    newer = build_request(kind: "add", submitter_display_name: "Captain", proposed_display_name: "Newer")
    newer.save!

    assert_equal [newer, older], @team.roster_change_requests.recent_first.to_a
  end

  test "reviewed? reflects non-pending status" do
    request = build_request(kind: "add", submitter_display_name: "Captain", proposed_display_name: "New Player")
    request.save!
    assert_not request.reviewed?

    request.update!(status: "approved")
    assert request.reviewed?
  end

  private

  def build_request(**attributes)
    @team.roster_change_requests.new(attributes)
  end
end
