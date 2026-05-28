require "test_helper"

class Wmgp::Rules::StandingsRankingTest < ActiveSupport::TestCase
  setup do
    @block_a_id = SecureRandom.uuid
    @block_b_id = SecureRandom.uuid
    @alpha = build_team("Alpha", block_id: @block_a_id)
    @beta = build_team("Beta", block_id: @block_a_id)
    @gamma = build_team("Gamma", block_id: @block_a_id)
    @delta = build_team("Delta", block_id: @block_b_id)
  end

  test "awards 3 points per win and ranks by the WMGP 5-tier tiebreaker" do
    team_stats = {
      @alpha.id => stats(wins: 2, round_wins: 4, round_losses: 1, board_wins: 8, board_losses: 4),
      @beta.id  => stats(wins: 2, round_wins: 5, round_losses: 2, board_wins: 6, board_losses: 5),
      @gamma.id => stats(wins: 0, round_wins: 1, round_losses: 7, board_wins: 2, board_losses: 9)
    }
    teams_by_block = { @block_a_id => [@alpha, @beta, @gamma] }

    rows = Wmgp::Rules::StandingsRanking.new.call(team_stats: team_stats, teams_by_block: teams_by_block).fetch(@block_a_id)

    assert_equal %w[Alpha Beta Gamma], rows.map { |row| row[:team].display_name },
      "Alpha and Beta tie on points (6) and goal_diff (3); Alpha wins on round_board_diff (4 vs 1)"
    assert_equal [1, 2, 3], rows.map { |row| row[:rank] }
    assert_equal [6, 6, 0], rows.map { |row| row[:points] }
    assert_equal [3, 3, -6], rows.map { |row| row[:goal_diff] }
  end

  test "assigns the same rank to teams whose ranking_values match exactly" do
    team_stats = {
      @alpha.id => stats(wins: 1, round_wins: 2, round_losses: 2, board_wins: 3, board_losses: 3, game_wins: 6, game_losses: 6),
      @beta.id  => stats(wins: 1, round_wins: 2, round_losses: 2, board_wins: 3, board_losses: 3, game_wins: 6, game_losses: 6),
      @gamma.id => stats(wins: 0, round_wins: 0, round_losses: 2, board_wins: 0, board_losses: 3)
    }
    teams_by_block = { @block_a_id => [@alpha, @beta, @gamma] }

    rows = Wmgp::Rules::StandingsRanking.new.call(team_stats: team_stats, teams_by_block: teams_by_block).fetch(@block_a_id)

    tied_ranks = rows.first(2).map { |row| row[:rank] }
    assert_equal [1, 1], tied_ranks, "Alpha and Beta share rank 1 because all 5 tiebreak values match"
    assert_equal 3, rows.last[:rank]
  end

  test "produces independent ranking results for each block" do
    team_stats = {
      @alpha.id => stats(wins: 1, round_wins: 2, round_losses: 0, board_wins: 4, board_losses: 0),
      @delta.id => stats(wins: 0, round_wins: 0, round_losses: 0, board_wins: 0, board_losses: 0)
    }
    teams_by_block = { @block_a_id => [@alpha], @block_b_id => [@delta] }

    result = Wmgp::Rules::StandingsRanking.new.call(team_stats: team_stats, teams_by_block: teams_by_block)

    assert_equal [1], result.fetch(@block_a_id).map { |row| row[:rank] }
    assert_equal [1], result.fetch(@block_b_id).map { |row| row[:rank] }
  end

  private

  def stats(**overrides)
    defaults = { wins: 0, round_wins: 0, round_losses: 0, board_wins: 0, board_losses: 0, game_wins: 0, game_losses: 0, forfeit_count: 0 }
    Standings::Aggregator::Stats.new(**defaults.merge(overrides))
  end

  def build_team(name, block_id:)
    Team.new(id: SecureRandom.uuid, display_name: name, block_id: block_id, status: "active")
  end
end
