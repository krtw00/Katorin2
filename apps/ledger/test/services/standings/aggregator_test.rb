require "test_helper"

class Standings::AggregatorTest < ActiveSupport::TestCase
  test "excludes bye and no_game matches but includes disqualification and forfeit_match" do
    phase, block = create_phase_with_block!
    alpha = phase.league.teams.create!(display_name: "Alpha", block: block)
    beta = phase.league.teams.create!(display_name: "Beta", block: block)

    create_match_with_result!(
      phase: phase, block: block, home_team: alpha, away_team: beta,
      decision_type: "no_game", home_round_wins: 2, away_round_wins: 0, winner_team: alpha,
      rounds: [[%w[home 2 0], %w[home 2 0], %w[home 2 0]]]
    )

    aggregation = Standings::Aggregator.call(phase)

    # no_game match must not be counted: both teams stay at zero wins.
    assert_equal 0, aggregation.team_stats[alpha.id].wins
    assert_equal 0, aggregation.team_stats[beta.id].wins
    assert_equal 0, aggregation.team_stats[alpha.id].round_wins
  end

  test "disqualification matches are aggregated into standings" do
    phase, block = create_phase_with_block!
    alpha = phase.league.teams.create!(display_name: "Alpha", block: block)
    beta = phase.league.teams.create!(display_name: "Beta", block: block)

    create_match_with_result!(
      phase: phase, block: block, home_team: alpha, away_team: beta,
      decision_type: "disqualification", home_round_wins: 2, away_round_wins: 0, winner_team: alpha,
      rounds: [[%w[home 2 0], %w[home 2 0], %w[home 2 0]], [%w[home 2 0], %w[home 2 0], %w[home 2 0]]]
    )

    aggregation = Standings::Aggregator.call(phase)

    assert_equal 1, aggregation.team_stats[alpha.id].wins
    assert_equal 2, aggregation.team_stats[alpha.id].round_wins
    assert_equal 0, aggregation.team_stats[beta.id].wins
  end

  test "forfeit_match results are aggregated into standings" do
    phase, block = create_phase_with_block!
    alpha = phase.league.teams.create!(display_name: "Alpha", block: block)
    beta = phase.league.teams.create!(display_name: "Beta", block: block)

    create_match_with_result!(
      phase: phase, block: block, home_team: alpha, away_team: beta,
      decision_type: "forfeit_match", home_round_wins: 2, away_round_wins: 0, winner_team: alpha,
      rounds: [[%w[home 2 0], %w[home 2 0], %w[home 2 0]], [%w[home 2 0], %w[home 2 0], %w[home 2 0]]]
    )

    aggregation = Standings::Aggregator.call(phase)

    assert_equal 1, aggregation.team_stats[alpha.id].wins
    assert_equal 2, aggregation.team_stats[alpha.id].round_wins
    assert_equal 0, aggregation.team_stats[beta.id].wins
  end

  private

  def create_phase_with_block!
    organizer = OrganizerAccount.create!(
      display_name: "Aggregator Organizer",
      login_id: "aggregator-org-#{SecureRandom.hex(4)}",
      email: "aggregator-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Aggregator League #{SecureRandom.hex(4)}",
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

  def create_match_with_result!(phase:, block:, home_team:, away_team:, decision_type:, home_round_wins:, away_round_wins:, winner_team:, rounds:)
    match = phase.matches.create!(
      league: phase.league,
      block: block,
      home_team: home_team,
      away_team: away_team,
      status: "confirmed"
    )

    # KAT-28 延長: forfeit_match / disqualification は penalty_side 必須。
    # winner_team が home なら away が没収、 反対も同様。
    penalty_side =
      if MatchResult::PENALTY_REQUIRED_DECISIONS.include?(decision_type.to_s)
        (winner_team&.id == home_team.id) ? "away" : "home"
      end

    match.create_match_result!(
      home_round_wins: home_round_wins,
      away_round_wins: away_round_wins,
      winner_team: winner_team,
      result_status: "confirmed",
      decision_type: decision_type,
      penalty_side: penalty_side
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
