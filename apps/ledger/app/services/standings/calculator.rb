module Standings
  class Calculator
    # @param phase [Phase] 対象フェーズ
    # @return [Hash<Integer, Array<Hash>>] block_id => [team_standing, ...]
    def self.call(phase)
      new(phase).call
    end

    def initialize(phase)
      @phase = phase
    end

    def call
      aggregation = Aggregator.call(@phase)
      ranking_rule = resolve_ranking_rule
      ranking_rule.call(
        team_stats: aggregation.team_stats,
        teams_by_block: aggregation.teams_by_block
      )
    end

    private

    def resolve_ranking_rule
      league_module = ::RuleModules::Registry.fetch(::RuleSets::Registry.default_key)
      league_module.rules.standings_ranking(@phase.ranking_rule_key)
    end
  end
end
