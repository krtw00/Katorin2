require "test_helper"

class ParticipantTest < ActiveSupport::TestCase
  setup do
    organizer_account = OrganizerAccount.create!(
      email: "participant-test@example.com",
      login_id: "participant-test",
      password: "password",
      display_name: "Participant Test"
    )
    @league = organizer_account.leagues.create!(
      name: "Participant Test League",
      started_at: Date.new(2026, 3, 23)
    )
    @team = @league.teams.create!(display_name: "Test Team")
  end

  test "member_id mirrors the primary (first) member_ids entry" do
    participant = build_participant(member_ids: ["MD-1", "MD-2", "MD-3"])
    assert participant.save
    assert_equal ["MD-1", "MD-2", "MD-3"], participant.member_ids
    assert_equal "MD-1", participant.member_id
  end

  test "member_id present and member_ids blank backfills member_ids (CSV path compat)" do
    participant = build_participant
    participant.member_id = "CSV-1"
    assert participant.save
    assert_equal ["CSV-1"], participant.member_ids
    assert_equal "CSV-1", participant.member_id
  end

  test "blank member_ids leave member_id nil" do
    participant = build_participant(member_ids: ["", "  "])
    assert participant.save
    assert_equal [], participant.member_ids
    assert_nil participant.member_id
  end

  test "rejects more than three member_ids" do
    participant = build_participant(member_ids: %w[A B C D])
    assert_not participant.save
    assert participant.errors.of_kind?(:member_ids, :too_many)
  end

  test "rejects duplicate member_id within the same league" do
    build_participant(display_name: "First", member_ids: ["DUP-1"]).save!

    other_team = @league.teams.create!(display_name: "Other Team")
    duplicate = Participant.new(
      league: @league,
      team: other_team,
      display_name: "Second",
      member_ids: ["DUP-1"]
    )
    assert_not duplicate.save
    assert duplicate.errors.of_kind?(:member_ids, :duplicate)
  end

  test "rejects duplicate member_id within a single participant" do
    participant = build_participant(member_ids: %w[SAME SAME])
    assert_not participant.save
    assert participant.errors.of_kind?(:member_ids, :duplicate)
  end

  test "allows withdrawn status" do
    participant = build_participant(status: "withdrawn")
    assert participant.save
    assert_equal "withdrawn", participant.reload.status
  end

  private

  def build_participant(**attributes)
    @team.participants.new({ league: @league, display_name: "Player" }.merge(attributes))
  end
end
