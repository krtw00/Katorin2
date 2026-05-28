module Wmgp
  module Rules
    # KAT-28 延長: WMGP の没収スコア / 失格スコア展開ルール。
    #
    # decision_type が forfeit_match / disqualification のとき、 penalty_side のチームに
    # 0 round wins、 相手側に 2 round wins を自動付与する。 ranking 上は別途
    # `StandingsRanking` が goal_diff から forfeit_count を減算する (= -1 ペナルティ)。
    class ForfeitScoreExpander
      DEFAULT_VICTIM_WINS = 2
      DEFAULT_FORFEITER_WINS = 0

      # @return [Hash{Symbol => Integer}] { home_round_wins:, away_round_wins: }
      def expand(decision_type:, penalty_side:)
        unless %w[forfeit_match disqualification].include?(decision_type.to_s)
          raise ArgumentError, "decision_type must be forfeit_match or disqualification: got #{decision_type.inspect}"
        end

        case penalty_side.to_s
        when "home"
          { home_round_wins: DEFAULT_FORFEITER_WINS, away_round_wins: DEFAULT_VICTIM_WINS }
        when "away"
          { home_round_wins: DEFAULT_VICTIM_WINS, away_round_wins: DEFAULT_FORFEITER_WINS }
        else
          raise ArgumentError, "penalty_side must be 'home' or 'away': got #{penalty_side.inspect}"
        end
      end
    end
  end
end
