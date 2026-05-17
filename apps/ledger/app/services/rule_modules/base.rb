module RuleModules
  class Base
    def key
      raise NotImplementedError, "#{self.class} must implement #key"
    end

    def rules
      raise NotImplementedError, "#{self.class} must implement #rules"
    end

    def renderers
      raise NotImplementedError, "#{self.class} must implement #renderers"
    end

    def reports
      raise NotImplementedError, "#{self.class} must implement #reports"
    end
  end
end
