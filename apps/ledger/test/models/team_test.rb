require "test_helper"

class TeamTest < ActiveSupport::TestCase
  test "assign_short_name normalizes whitespace and limits grapheme clusters" do
    organizer_account = OrganizerAccount.create!(
      email: "team-test@example.com",
      login_id: "team-test",
      password: "password",
      display_name: "Team Test"
    )
    league = organizer_account.leagues.create!(
      name: "Team Test League",
      started_at: Date.new(2026, 3, 23)
    )

    team = league.teams.create!(
      display_name: "  Alpha   Bravo  Charlie  Delta  "
    )

    assert_equal "Alpha Bravo ", team.short_name
  end

  test "assign_short_name preserves multi-byte grapheme clusters" do
    organizer_account = OrganizerAccount.create!(
      email: "unicode-team-test@example.com",
      login_id: "unicode-team-test",
      password: "password",
      display_name: "Unicode Team Test"
    )
    league = organizer_account.leagues.create!(
      name: "Unicode Team League",
      started_at: Date.new(2026, 3, 23)
    )

    team = league.teams.create!(
      display_name: "チーム😀ÁBCDEFGHIJ"
    )

    assert_equal "チーム😀ÁBCDEFGH", team.short_name
  end
end
