require "test_helper"

class MatchExports::ResultCardRendererTest < ActiveSupport::TestCase
  test "versus header uses VS label" do
    match = create_match_for_renderer_test!(home_name: "Alpha Team", away_name: "Beta Team")

    html = MatchExports::ResultCardRenderer.new(match).send(:versus_html)

    assert_includes html, ">VS<"
    assert_not_includes html, ">対<"
  end

  test "renderer falls back to board scores when stored winners are stale" do
    match = create_match_for_renderer_test!(home_name: "StardustHope", away_name: "ST | KnikxLaw")
    round_one = match.rounds.create!(
      number: 1,
      home_team: match.home_team,
      away_team: match.away_team,
      result_status: "partial",
      winner_team: nil
    )
    round_two = match.rounds.create!(
      number: 2,
      home_team: match.home_team,
      away_team: match.away_team,
      result_status: "confirmed",
      winner_team: match.home_team
    )

    create_confirmed_board_result!(round: round_one, board_number: 1, score: [2, 0], winner_side: nil)
    create_confirmed_board_result!(round: round_one, board_number: 2, score: [2, 0], winner_side: nil)
    create_confirmed_board_result!(round: round_one, board_number: 3, score: [2, 0], winner_side: nil)
    create_confirmed_board_result!(round: round_two, board_number: 1, score: [2, 1], winner_side: "home")
    create_confirmed_board_result!(round: round_two, board_number: 2, score: [2, 1], winner_side: "home")
    create_confirmed_board_result!(round: round_two, board_number: 3, score: [1, 2], winner_side: "away")

    match.create_match_result!(
      home_round_wins: 1,
      away_round_wins: 0,
      winner_team: match.home_team,
      result_status: "partial",
      decision_type: "normal"
    )

    renderer = MatchExports::ResultCardRenderer.new(match.reload)

    round_one_html = renderer.send(:round_result_html, match.rounds.find_by!(number: 1))
    footer_html = renderer.send(:footer_html)

    assert_includes round_one_html, '<span class="win">W</span>'
    assert_includes round_one_html, '<span class="lose">L</span>'
    assert_includes footer_html, '<div class="footer-score">2 - 0</div>'
  end

  private

  def create_match_for_renderer_test!(home_name:, away_name:)
    organizer = OrganizerAccount.create!(
      display_name: "Renderer Organizer",
      login_id: "renderer-org-#{SecureRandom.hex(4)}",
      email: "renderer-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Renderer League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: home_name)
    away_team = league.teams.create!(display_name: away_name)

    week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      scheduled_on: Date.new(2026, 4, 11),
      scheduled_time: Time.zone.parse("20:00"),
      status: "scheduled"
    )
  end

  def create_confirmed_board_result!(round:, board_number:, score:, winner_side:)
    round.board_results.create!(
      board_number: board_number,
      home_game_wins: score[0],
      away_game_wins: score[1],
      result_status: "confirmed",
      winner_side: winner_side
    )
  end
end
