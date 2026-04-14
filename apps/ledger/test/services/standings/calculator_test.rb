require "test_helper"

class Standings::CalculatorTest < ActiveSupport::TestCase
  test "uses round win differential before board-level tiebreakers" do
    phase, block = create_phase_with_block!
    alpha = phase.league.teams.create!(display_name: "Alpha", block: block)
    beta = phase.league.teams.create!(display_name: "Beta", block: block)
    gamma = phase.league.teams.create!(display_name: "Gamma", block: block)

    create_match_with_result!(
      phase: phase,
      block: block,
      home_team: alpha,
      away_team: gamma,
      home_round_wins: 2,
      away_round_wins: 0,
      winner_team: alpha,
      rounds: [
        [%w[home 2 1], %w[home 2 1], %w[away 1 2]],
        [%w[home 2 1], %w[home 2 1], %w[away 1 2]]
      ]
    )

    create_match_with_result!(
      phase: phase,
      block: block,
      home_team: beta,
      away_team: gamma,
      home_round_wins: 2,
      away_round_wins: 1,
      winner_team: beta,
      rounds: [
        [%w[home 2 0], %w[home 2 0], %w[home 2 0]],
        [%w[away 0 2], %w[away 0 2], %w[away 0 2]],
        [%w[home 2 0], %w[home 2 0], %w[home 2 0]]
      ]
    )

    rows = Standings::Calculator.call(phase).fetch(block.id)

    assert_equal %w[Alpha Beta Gamma], rows.map { |row| row[:team].display_name }
    assert_equal [1, 2, 3], rows.map { |row| row[:rank] }

    alpha_row = rows.find { |row| row[:team].display_name == "Alpha" }
    beta_row = rows.find { |row| row[:team].display_name == "Beta" }

    assert_equal 3, alpha_row[:points]
    assert_equal 3, beta_row[:points]
    assert_operator alpha_row[:goal_diff], :>, beta_row[:goal_diff]
    assert_operator alpha_row[:round_board_diff], :<, beta_row[:round_board_diff]
  end

  private

  def create_phase_with_block!
    organizer = OrganizerAccount.create!(
      display_name: "Standings Organizer",
      login_id: "standings-org-#{SecureRandom.hex(4)}",
      email: "standings-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Standings League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "Regular Stage", position: 1, rule_module_key: "wmgp")
    block = phase.blocks.create!(league: league, name: "A", position: 1)

    [phase, block]
  end

  def create_match_with_result!(phase:, block:, home_team:, away_team:, home_round_wins:, away_round_wins:, winner_team:, rounds:)
    match = phase.matches.create!(
      league: phase.league,
      block: block,
      home_team: home_team,
      away_team: away_team,
      status: "confirmed"
    )

    match.create_match_result!(
      home_round_wins: home_round_wins,
      away_round_wins: away_round_wins,
      winner_team: winner_team,
      result_status: "confirmed",
      decision_type: "normal"
    )

    rounds.each_with_index do |boards, index|
      home_board_wins = boards.count { |winner_side, _, _| winner_side == "home" }
      away_board_wins = boards.count { |winner_side, _, _| winner_side == "away" }
      round_winner = if home_board_wins > away_board_wins
                       home_team
                     elsif away_board_wins > home_board_wins
                       away_team
                     end

      round = match.rounds.create!(
        number: index + 1,
        home_team: home_team,
        away_team: away_team,
        winner_team: round_winner,
        result_status: "confirmed"
      )

      boards.each_with_index do |(winner_side, home_game_wins, away_game_wins), board_index|
        round.board_results.create!(
          board_number: board_index + 1,
          winner_side: winner_side,
          home_game_wins: home_game_wins.to_i,
          away_game_wins: away_game_wins.to_i,
          result_status: "confirmed"
        )
      end
    end

    match
  end
end
