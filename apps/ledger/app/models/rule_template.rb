class RuleTemplate < ApplicationRecord
  FORMATS = %w[round_robin swiss single_elimination].freeze
  PARTICIPANT_SCOPES = %w[all_teams qualified_teams manual_selection].freeze
  ADVANCEMENT_RULES = %w[none top_n_per_group top_n_overall manual].freeze

  belongs_to :organizer_account

  normalizes :key, with: ->(value) { value.strip.downcase }
  normalizes :name_ja, with: ->(value) { value.strip }
  normalizes :name_en, with: ->(value) { value.strip }

  validates :key, presence: true, uniqueness: { scope: :organizer_account_id }, format: { with: /\A[a-z0-9][a-z0-9_-]*\z/ }
  validates :name_ja, :name_en, presence: true
  validate :key_must_not_shadow_builtin
  validate :definition_must_be_valid

  def definition_for_registry
    payload = deep_dup(definition.presence || {})
    payload["key"] = key
    payload["name"] = {
      "ja" => name_ja,
      "en" => name_en,
    }
    payload["description"] = {
      "ja" => description_ja.to_s,
      "en" => description_en.to_s,
    }
    payload
  end

  private

  def key_must_not_shadow_builtin
    return if RuleSets::Registry.builtin_keys.exclude?(key)

    errors.add(:key, :taken)
  end

  def definition_must_be_valid
    payload = definition_for_registry

    unless payload["roster_rules"].is_a?(Hash)
      errors.add(:definition, :invalid)
      return
    end

    stages = Array(payload["stages"])
    if stages.empty?
      errors.add(:definition, :invalid)
      return
    end

    stages.each_with_index do |stage, index|
      unless stage.is_a?(Hash)
        errors.add(:definition, "stage #{index + 1} is invalid")
        next
      end

      errors.add(:definition, "stage #{index + 1} key is required") if stage["key"].blank?
      errors.add(:definition, "stage #{index + 1} name is required") if stage["name"].blank?
      errors.add(:definition, "stage #{index + 1} format is invalid") unless FORMATS.include?(stage["format"])
      errors.add(:definition, "stage #{index + 1} participant scope is invalid") unless PARTICIPANT_SCOPES.include?(stage["participant_scope"])
      errors.add(:definition, "stage #{index + 1} advancement rule is invalid") unless ADVANCEMENT_RULES.include?(stage["advancement_rule"])
    end
  end

  def deep_dup(value)
    Marshal.load(Marshal.dump(value))
  end
end
