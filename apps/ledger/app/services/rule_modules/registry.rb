module RuleModules
  class Registry
    class << self
      def register(rule_module)
        modules[rule_module.key.to_s] = rule_module
      end

      def fetch(key)
        modules.fetch(key.to_s) do
          raise KeyError, "Unknown rule module: #{key}"
        end
      end

      def keys
        modules.keys
      end

      def reset!
        @modules = nil
      end

      private

      def modules
        @modules ||= {}
      end
    end
  end
end
