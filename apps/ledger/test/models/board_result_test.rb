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

  test "1-1 is treated as a confirmed draw without winner_side" do
    round = create_round_for_board_result_test!

    board_result = round.board_results.build(
      board_number: 1,
      home_game_wins: 1,
      away_game_wins: 1,
      result_status: "confirmed",
      winner_side: BoardResult.infer_winner_side(1, 1)
    )

    assert board_result.valid?
    assert_nil board_result.winner_side
    assert board_result.confirmed_score?
  end

  test "1-0 is treated as a confirmed home win" do
    assert BoardResult.valid_confirmed_score?(1, 0)
    assert_equal "home", BoardResult.infer_winner_side(1, 0)
  end

  test "0-1 is treated as a confirmed away win" do
    assert BoardResult.valid_confirmed_score?(0, 1)
    assert_equal "away", BoardResult.infer_winner_side(0, 1)
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
