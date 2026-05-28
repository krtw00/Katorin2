require "test_helper"

class Standings::AggregatorForfeitTest < ActiveSupport::TestCase
  test "counts forfeit per penalized team and feeds StandingsRanking goal_diff penalty" do
    phase, home, away = setup_phase_with_match_forfeit!

    aggregation = Standings::Aggregator.call(phase.reload)
    home_stats = aggregation.team_stats[home.id]
    away_stats = aggregation.team_stats[away.id]

    assert_equal 0, home_stats.forfeit_count
    assert_equal 1, away_stats.forfeit_count

    # ranking 上で goal_diff から forfeit_count を減算
    rows = Wmgp::Rules::StandingsRanking.new.call(
      team_stats: aggregation.team_stats,
      teams_by_block: aggregation.teams_by_block
    ).values.flatten
    away_row = rows.find { |r| r[:team].id == away.id }
    home_row = rows.find { |r| r[:team].id == home.id }

    # away: round_wins 0 - round_losses 2 - forfeit_count 1 = -3
    assert_equal(-3, away_row[:goal_diff])
    # home: round_wins 2 - round_losses 0 - 0 = 2
    assert_equal 2, home_row[:goal_diff]
  end

  private

  def setup_phase_with_match_forfeit!
    organizer = OrganizerAccount.create!(
      display_name: "Agg Test",
      login_id: "agg-#{SecureRandom.hex(4)}",
      email: "agg-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Agg League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "Regular", position: 1, rule_module_key: "wmgp")
    block = phase.blocks.create!(league: league, name: "A", position: 1)
    home = league.teams.create!(display_name: "Home", block: block)
    away = league.teams.create!(display_name: "Away", block: block)
    match = phase.matches.create!(
      league: league,
      block: block,
      home_team: home,
      away_team: away,
      status: "confirmed"
    )
    match.create_match_result!(
      home_round_wins: 2,
      away_round_wins: 0,
      result_status: "confirmed",
      decision_type: "forfeit_match",
      penalty_side: "away",
      winner_team: home,
      confirmed_at: Time.current
    )
    [phase, home, away]
  end
end
