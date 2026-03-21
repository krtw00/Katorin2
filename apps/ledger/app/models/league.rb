class League < ApplicationRecord
  belongs_to :organizer_account

  has_many :phases, -> { order(:position) }, dependent: :destroy
  has_many :blocks, dependent: :destroy
  has_many :teams, dependent: :destroy
  has_many :participants, dependent: :destroy
  has_many :weeks, dependent: :destroy
  has_many :matches, dependent: :destroy
  has_many :exports, dependent: :destroy

  before_validation :sync_ruleset_snapshot

  validates :name, :slug, :rule_module_key, presence: true
  validates :slug, uniqueness: true
  validate :rule_module_key_must_exist

  def effective_ruleset_snapshot
    ruleset_snapshot.presence || RuleSets::Registry.fetch(rule_module_key)
  rescue KeyError
    {}
  end

  private

  def sync_ruleset_snapshot
    return if rule_module_key.blank?
    return unless ruleset_snapshot.blank? || will_save_change_to_rule_module_key?

    self.ruleset_snapshot = RuleSets::Registry.fetch(rule_module_key)
  rescue KeyError
    self.ruleset_snapshot = nil
  end

  def rule_module_key_must_exist
    RuleSets::Registry.fetch(rule_module_key)
  rescue KeyError
    errors.add(:rule_module_key, :inclusion)
  end
end
