class League < ApplicationRecord
  belongs_to :organizer_account
  has_one_attached :header_image

  has_many :phases, -> { order(:position) }, dependent: :destroy
  has_many :blocks, dependent: :destroy
  has_many :teams, dependent: :destroy
  has_many :participants, dependent: :destroy
  has_many :weeks, dependent: :destroy
  has_many :matches, dependent: :destroy
  has_many :exports, dependent: :destroy

  before_validation :assign_serial_number, on: :create
  before_validation :assign_slug
  before_validation :assign_rule_module_key
  before_validation :sync_ruleset_snapshot

  validates :name, :slug, :rule_module_key, :serial_number, presence: true
  validates :roster_min_members, :roster_max_members, :lineup_size, :substitute_size, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :roster_config_consistent
  validates :slug, uniqueness: true
  validates :serial_number, numericality: { only_integer: true, greater_than: 0 }, uniqueness: { scope: :organizer_account_id }
  validate :rule_module_key_must_exist

  def effective_ruleset_snapshot
    ruleset_snapshot.presence || RuleSets::Registry.fetch(rule_module_key, organizer_account:)
  rescue KeyError
    {}
  end

  def draft_status?
    status == "draft"
  end

  def destroyable?
    draft_status?
  end

  def destroy_for_management!
    transaction do
      exports.destroy_all
      matches.destroy_all
      weeks.destroy_all
      blocks.destroy_all
      participants.destroy_all
      teams.destroy_all
      phases.destroy_all
      destroy!
    end
  end

  def display_number
    format("%03d", serial_number) if serial_number.present?
  end

  private

  def assign_rule_module_key
    self.rule_module_key = "wmgp" if rule_module_key.blank?
  end

  def assign_serial_number
    return if serial_number.present? || organizer_account.blank?

    self.serial_number = organizer_account.leagues.maximum(:serial_number).to_i + 1
  end

  def assign_slug
    return if slug.present?
    return if organizer_account_id.blank? || serial_number.blank?

    self.slug = "league-#{organizer_account_id.delete('-').first(8)}-#{format('%03d', serial_number)}"
  end

  def sync_ruleset_snapshot
    return if rule_module_key.blank?
    return unless ruleset_snapshot.blank? || will_save_change_to_rule_module_key?

    self.ruleset_snapshot = RuleSets::Registry.fetch(rule_module_key, organizer_account:)
  rescue KeyError
    self.ruleset_snapshot = nil
  end

  def rule_module_key_must_exist
    RuleSets::Registry.fetch(rule_module_key, organizer_account:)
  rescue KeyError
    errors.add(:rule_module_key, :inclusion)
  end

  def roster_config_consistent
    return if roster_min_members.blank? || roster_max_members.blank? || lineup_size.blank? || substitute_size.blank?

    errors.add(:roster_max_members, :greater_than_or_equal_to, count: roster_min_members) if roster_max_members < roster_min_members
    errors.add(:lineup_size, :greater_than, count: 0) if lineup_size <= 0
    return unless lineup_size + substitute_size > roster_max_members

    errors.add(:substitute_size, :less_than_or_equal_to, count: roster_max_members - lineup_size)
  end
end
