require "test_helper"

class MatchResults::RecorderConcurrencyTest < ActiveSupport::TestCase
  test "MatchResult model raises StaleObjectError on concurrent update" do
    match = create_match!
    result = match.create_match_result!(
      home_round_wins: 1, away_round_wins: 1,
      result_status: "partial", decision_type: "normal"
    )
    assert_equal 0, result.lock_version

    # judge A と judge B が同時に load
    judge_a_view = MatchResult.find(result.id)
    judge_b_view = MatchResult.find(result.id)

    # judge B が先に save
    judge_b_view.update!(home_round_wins: 2, away_round_wins: 0, result_status: "confirmed")
    assert_equal 1, judge_b_view.reload.lock_version

    # judge A が古い lock_version=0 のまま save → stale で raise
    judge_a_view.home_round_wins = 0
    judge_a_view.away_round_wins = 2
    assert_raises(ActiveRecord::StaleObjectError) do
      judge_a_view.save!
    end
  end

  test "Recorder propagates submitted lock_version so stale form submission raises" do
    match = create_match!

    # 1st save (INSERT 経由、 forfeit で home 勝ち): lock_version は default 0 のまま
    MatchResults::Recorder.new(match, payload_with_lock(0, decision_type: :forfeit_match, penalty_side: "away")).save!
    assert_equal 0, match.reload.match_result.lock_version
    assert_equal 2, match.match_result.home_round_wins # expander で home 2-0

    # 2nd save (UPDATE、 penalty_side 切替で dirty): 成功 → lock_version=1
    MatchResults::Recorder.new(match, payload_with_lock(0, decision_type: :forfeit_match, penalty_side: "home")).save!
    assert_equal 1, match.reload.match_result.lock_version
    assert_equal 0, match.match_result.home_round_wins # 逆向きに上書き

    # 3rd save: まだ古い form lock_version=0 で submit → DB は 1 → stale で raise
    assert_raises(ActiveRecord::StaleObjectError) do
      MatchResults::Recorder.new(match, payload_with_lock(0, decision_type: :forfeit_match, penalty_side: "away")).save!
    end
  end

  test "Recorder with force_overwrite saves successfully even with stale form lock_version" do
    match = create_match!

    # 1st save: lock_version=0 → 0 のまま (forfeit で away ペナ → home 2-0)
    MatchResults::Recorder.new(match, payload_with_lock(0, decision_type: :forfeit_match, penalty_side: "away")).save!
    assert_equal 0, match.reload.match_result.lock_version
    assert_equal 2, match.match_result.home_round_wins

    # 2nd save: lock_version=0 → 1 (penalty_side 切替で UPDATE)
    MatchResults::Recorder.new(match, payload_with_lock(0, decision_type: :forfeit_match, penalty_side: "home")).save!
    assert_equal 1, match.reload.match_result.lock_version
    assert_equal 0, match.match_result.home_round_wins

    # 3rd save: form lock_version=0 (stale) でも force_overwrite=true なら reload で DB 最新 (=1) を取り直して save 成功
    MatchResults::Recorder.new(
      match,
      payload_with_lock(0, decision_type: :forfeit_match, penalty_side: "away"),
      force_overwrite: true
    ).save!
    assert_equal 2, match.reload.match_result.lock_version
    assert_equal 2, match.match_result.home_round_wins # away ペナで home が勝ちに戻る
  end

  private

  def payload_with_lock(version, decision_type: :normal, penalty_side: nil)
    payload = {
      "decision_type" => decision_type.to_s,
      "lock_version" => version.to_s,
      "rounds" => {}
    }
    payload["penalty_side"] = penalty_side if penalty_side
    payload
  end

  def create_match!
    organizer = OrganizerAccount.create!(
      display_name: "Concurrency Test",
      login_id: "concur-#{SecureRandom.hex(4)}",
      email: "concur-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Concurrency League #{SecureRandom.hex(4)}",
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
