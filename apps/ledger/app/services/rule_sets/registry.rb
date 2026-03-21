module RuleSets
  class Registry
    RULESET_DIR = Rails.root.join("config/rulesets").freeze

    class << self
      def default_key
        "wmgp"
      end

      def all(organizer_account: nil)
        (builtin_definitions.values + custom_definitions(organizer_account).values).map { |definition| deep_dup(definition) }
      end

      def fetch(key, organizer_account: nil)
        definition = custom_definitions(organizer_account)[key.to_s] || builtin_definitions[key.to_s]
        raise KeyError, "Unknown ruleset: #{key}" unless definition

        deep_dup(definition)
      end

      def builtin_keys
        builtin_definitions.keys
      end

      private

      def builtin_definitions
        @builtin_definitions ||= Dir[RULESET_DIR.join("*.json")].sort.each_with_object({}) do |path, memo|
          definition = JSON.parse(File.read(path))
          memo[definition.fetch("key")] = definition
        end
      end

      def custom_definitions(organizer_account)
        return {} unless organizer_account
        return {} unless rule_templates_table_exists?

        organizer_account.rule_templates.where(active: true).order(:name_ja).each_with_object({}) do |template, memo|
          memo[template.key] = template.definition_for_registry
        end
      end

      def rule_templates_table_exists?
        ActiveRecord::Base.connection.data_source_exists?("rule_templates")
      rescue ActiveRecord::NoDatabaseError, ActiveRecord::StatementInvalid
        false
      end

      def deep_dup(value)
        Marshal.load(Marshal.dump(value))
      end
    end
  end
end
