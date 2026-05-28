require "test_helper"

class MatchResults::RecorderForfeitTest < ActiveSupport::TestCase
  test "forfeit_match with penalty_side=away forces 2-0 even if rounds say otherwise" do
    match = create_match!

    # rounds は away 圧勝 (away 2-0) で送るが、 penalty_side=away なので
    # expander が home 2 / away 0 で上書き
    payload = {
      "decision_type" => "forfeit_match",
      "penalty_side" => "away",
      "rounds" => {
        "1" => { "boards" => boards_pattern(home_wins: 0, away_wins: 2) },
        "2" => { "boards" => boards_pattern(home_wins: 0, away_wins: 2) }
      }
    }
    MatchResults::Recorder.new(match, payload).save!
    match.reload

    assert_equal "confirmed", match.match_result.result_status
    assert_equal 2, match.match_result.home_round_wins
    assert_equal 0, match.match_result.away_round_wins
    assert_equal match.home_team_id, match.match_result.winner_team_id
    assert_equal "away", match.match_result.penalty_side
  end

  test "forfeit_match with penalty_side=home forces away win" do
    match = create_match!
    payload = {
      "decision_type" => "forfeit_match",
      "penalty_side" => "home",
      "rounds" => { "1" => { "boards" => boards_pattern(home_wins: 2, away_wins: 0) } }
    }
    MatchResults::Recorder.new(match, payload).save!
    match.reload

    assert_equal 0, match.match_result.home_round_wins
    assert_equal 2, match.match_result.away_round_wins
    assert_equal match.away_team_id, match.match_result.winner_team_id
  end

  test "normal decision_type silently strips penalty_side" do
    match = create_match!
    payload = {
      "decision_type" => "normal",
      "penalty_side" => "home",
      "rounds" => { "1" => { "boards" => boards_pattern(home_wins: 2, away_wins: 0) } }
    }

    MatchResults::Recorder.new(match, payload).save!
    assert_nil match.reload.match_result.penalty_side
    assert_equal "normal", match.match_result.decision_type
  end

  test "forfeit without penalty_side raises validation error" do
    match = create_match!
    payload = {
      "decision_type" => "forfeit_match",
      "rounds" => { "1" => { "boards" => boards_pattern(home_wins: 2, away_wins: 0) } }
    }

    assert_raises(ActiveRecord::RecordInvalid) do
      MatchResults::Recorder.new(match, payload).save!
    end
  end

  private

  def boards_pattern(home_wins:, away_wins:)
    (1..3).index_with do |_n|
      { "home_game_wins" => home_wins.to_s, "away_game_wins" => away_wins.to_s }
    end.transform_keys(&:to_s)
  end

  def create_match!
    organizer = OrganizerAccount.create!(
      display_name: "Forfeit Test",
      login_id: "forfeit-#{SecureRandom.hex(4)}",
      email: "forfeit-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Forfeit League #{SecureRandom.hex(4)}",
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
    phase.matches.create!(
      league: league,
      block: block,
      home_team: home,
      away_team: away,
      status: "scheduled"
    )
  end
end
