module RuleSets
  class Registry
    RULESET_DIR = Rails.root.join("config/rulesets").freeze

    class << self
      def default_key
        "wmgp"
      end

      def all
        definitions.values.map { |definition| deep_dup(definition) }
      end

      def fetch(key)
        definition = definitions[key.to_s]
        raise KeyError, "Unknown ruleset: #{key}" unless definition

        deep_dup(definition)
      end

      private

      def definitions
        @definitions ||= Dir[RULESET_DIR.join("*.json")].sort.each_with_object({}) do |path, memo|
          definition = JSON.parse(File.read(path))
          memo[definition.fetch("key")] = definition
        end
      end

      def deep_dup(value)
        Marshal.load(Marshal.dump(value))
      end
    end
  end
end
