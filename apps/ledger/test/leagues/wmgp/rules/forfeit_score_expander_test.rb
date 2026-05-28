require "test_helper"

class Wmgp::Rules::ForfeitScoreExpanderTest < ActiveSupport::TestCase
  test "penalty_side=home gives away 2-0" do
    result = Wmgp::Rules::ForfeitScoreExpander.new.expand(decision_type: "forfeit_match", penalty_side: "home")
    assert_equal({ home_round_wins: 0, away_round_wins: 2 }, result)
  end

  test "penalty_side=away gives home 2-0" do
    result = Wmgp::Rules::ForfeitScoreExpander.new.expand(decision_type: "disqualification", penalty_side: "away")
    assert_equal({ home_round_wins: 2, away_round_wins: 0 }, result)
  end

  test "raises on invalid decision_type" do
    assert_raises(ArgumentError) do
      Wmgp::Rules::ForfeitScoreExpander.new.expand(decision_type: "normal", penalty_side: "home")
    end
  end

  test "raises on invalid penalty_side" do
    assert_raises(ArgumentError) do
      Wmgp::Rules::ForfeitScoreExpander.new.expand(decision_type: "forfeit_match", penalty_side: nil)
    end
  end
end
