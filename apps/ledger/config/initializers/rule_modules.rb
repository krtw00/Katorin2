Rails.application.config.to_prepare do
  RuleModules::Registry.reset!
  RuleModules::Registry.register(Wmgp::LeagueModule.new)
end
