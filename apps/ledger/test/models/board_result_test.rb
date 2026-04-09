require "test_helper"

class BoardResultTest < ActiveSupport::TestCase
  test "winner_side allows nil for partial board results" do
    round = create_round_for_board_result_test!

    board_result = round.board_results.build(
      board_number: 1,
      result_status: "partial",
      winner_side: nil
    )

    assert board_result.valid?
  end

  test "winner_side inclusion error is localized in Japanese" do
    round = create_round_for_board_result_test!

    board_result = round.board_results.build(
      board_number: 1,
      result_status: "partial"
    )
    board_result[:winner_side] = "invalid"

    I18n.with_locale(:ja) do
      assert_not board_result.valid?
      assert_includes board_result.errors.full_messages, "勝者サイド は一覧にありません。"
    end
  end

  private

  def create_round_for_board_result_test!
    organizer_account = OrganizerAccount.create!(
      email: "board-result-test@example.com",
      login_id: "board-result-test",
      password: "password",
      display_name: "Board Result Test"
    )
    league = organizer_account.leagues.create!(
      name: "Board Result Test League",
      started_at: Date.new(2026, 4, 9)
    )
    phase = league.phases.create!(
      name: "予選 1",
      position: 1,
      rule_module_key: "wmgp",
      bracket_enabled: false
    )
    week = phase.weeks.create!(
      league: league,
      number: 1,
      position: 1
    )
    home_team = league.teams.create!(display_name: "Home Team", status: "active")
    away_team = league.teams.create!(display_name: "Away Team", status: "active")
    match = week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      status: "scheduled"
    )

    match.rounds.create!(
      number: 1,
      home_team: home_team,
      away_team: away_team,
      result_status: "partial"
    )
  end
end
