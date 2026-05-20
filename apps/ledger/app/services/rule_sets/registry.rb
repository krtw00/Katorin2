module RuleSets
  class Registry
    RULESET_DIR = Rails.root.join("config/rulesets").freeze

    class << self
      def default_key
        builtin_keys.first
      end

      def all(organizer_account: nil)
        builtin_definitions.values.map { |definition| deep_dup(definition) }
      end

      def builtin
        builtin_definitions.values.map { |definition| deep_dup(definition) }
      end

      def fetch(key, organizer_account: nil)
        definition = builtin_definitions[key.to_s]
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

      def deep_dup(value)
        Marshal.load(Marshal.dump(value))
      end
    end
  end
end
