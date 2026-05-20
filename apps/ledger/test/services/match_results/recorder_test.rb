require "test_helper"

class MatchResults::RecorderTest < ActiveSupport::TestCase
  test "persists each decision_type enum value" do
    match = create_match!

    MatchResult::DECISION_TYPES.keys.each do |decision_type|
      next if decision_type == :bye # bye は progression_sync 専用 (operator は入力しない)

      MatchResults::Recorder.new(match, confirmed_payload(decision_type: decision_type)).save!
      match.reload

      assert_equal decision_type.to_s, match.match_result.decision_type
    end
  end

  test "stores bye decision_type when written directly (progression_sync 互換)" do
    match = create_match!
    result = match.create_match_result!(
      home_round_wins: 2,
      away_round_wins: 0,
      winner_team: match.home_team,
      result_status: "confirmed",
      decision_type: "bye"
    )

    assert result.bye?
    assert_equal "bye", result.reload.decision_type
  end

  test "forfeit_match confirms without member or deck names" do
    match = create_match!

    MatchResults::Recorder.new(match, confirmed_payload(decision_type: :forfeit_match)).save!
    match.reload

    assert_equal "confirmed", match.match_result.result_status
    assert_equal "confirmed", match.status
    assert_equal match.home_team_id, match.match_result.winner_team_id
    assert_equal 2, match.match_result.home_round_wins
    # 選手名・デッキ未入力でも board が confirmed になっている
    confirmed_boards = match.rounds.flat_map(&:board_results)
    assert confirmed_boards.any?
    assert confirmed_boards.all? { |board| board.result_status == "confirmed" }
    assert confirmed_boards.all? { |board| board.home_participant_id.nil? && board.home_deck_name.nil? }
  end

  test "disqualification confirms without member or deck names" do
    match = create_match!

    MatchResults::Recorder.new(match, confirmed_payload(decision_type: :disqualification)).save!
    match.reload

    assert_equal "confirmed", match.match_result.result_status
    assert_equal "disqualification", match.match_result.decision_type
  end

  test "normal decision still requires member and deck to confirm a board" do
    match = create_match!

    MatchResults::Recorder.new(match, confirmed_payload(decision_type: :normal)).save!
    match.reload

    # 選手名・デッキ未入力なので board は partial 止まり -> round 未確定 -> match 未確定
    assert_equal "partial", match.match_result.result_status
    assert_not_equal "confirmed", match.status
    assert match.rounds.flat_map(&:board_results).all? { |board| board.result_status == "partial" }
  end

  test "defaults to normal when decision_type is missing or invalid" do
    match = create_match!

    MatchResults::Recorder.new(match, confirmed_payload.except("decision_type")).save!
    assert_equal "normal", match.reload.match_result.decision_type

    MatchResults::Recorder.new(match, confirmed_payload(decision_type: "bogus")).save!
    assert_equal "normal", match.reload.match_result.decision_type
  end

  private

  def create_match!
    organizer = OrganizerAccount.create!(
      display_name: "Recorder Organizer",
      login_id: "recorder-org-#{SecureRandom.hex(4)}",
      email: "recorder-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Recorder League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "Regular Stage", position: 1, rule_module_key: "wmgp")
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

  # rounds 1-2 を home の 2-0 で埋める (= home 2 round wins -> 確定可能なスコア)。
  # 選手名・デッキは未入力 (= 失格/没収では緩和、normal では board が partial 止まり)。
  def confirmed_payload(decision_type: :normal)
    boards = (1..3).index_with do |_board_number|
      { "home_game_wins" => "2", "away_game_wins" => "0" }
    end.transform_keys(&:to_s)

    {
      "decision_type" => decision_type.to_s,
      "rounds" => {
        "1" => { "boards" => boards },
        "2" => { "boards" => boards }
      }
    }
  end
end
