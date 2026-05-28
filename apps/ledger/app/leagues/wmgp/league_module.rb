module Wmgp
  class LeagueModule < ::RuleModules::Base
    KEY = "wmgp".freeze
    DISPLAY_NAME = { ja: "WMGP台帳", en: "WMGP Ledger" }.freeze

    def key
      KEY
    end

    def display_name(locale = I18n.locale)
      DISPLAY_NAME.fetch(locale.to_sym) { DISPLAY_NAME.fetch(:en) }
    end

    def rules
      @rules ||= Rules.new
    end

    def renderers
      @renderers ||= Renderers.new
    end

    def reports
      @reports ||= Reports.new
    end

    class Rules
      def standings
        ::Standings::Calculator
      end

      def standings_ranking(_ranking_rule_key = nil)
        @standings_ranking ||= ::Wmgp::Rules::StandingsRanking.new
      end

      def forfeit_score_expander
        @forfeit_score_expander ||= ::Wmgp::Rules::ForfeitScoreExpander.new
      end
    end

    class Renderers
      def match_result_card
        ::Wmgp::Renderers::MatchResultCard
      end

      def standings_table
        ::Wmgp::Renderers::StandingsTable
      end
    end

    class Reports
    end
  end
end
