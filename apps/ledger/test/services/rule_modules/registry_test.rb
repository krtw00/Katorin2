require "test_helper"

class RuleModules::RegistryTest < ActiveSupport::TestCase
  test "wmgp module is registered with expected hooks" do
    rule_module = RuleModules::Registry.fetch("wmgp")

    assert_kind_of Wmgp::LeagueModule, rule_module
    assert_equal "wmgp", rule_module.key
    assert_equal Standings::Calculator, rule_module.rules.standings
    assert_equal Wmgp::Renderers::MatchResultCard, rule_module.renderers.match_result_card
    assert_equal StandingsExports::TableRenderer, rule_module.renderers.standings_table
  end

  test "fetching unknown key raises KeyError" do
    assert_raises(KeyError) do
      RuleModules::Registry.fetch("unknown-league")
    end
  end

  test "keys returns registered module keys" do
    assert_includes RuleModules::Registry.keys, "wmgp"
  end
end
