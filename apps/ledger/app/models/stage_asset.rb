class StageAsset < ApplicationRecord
  FORMATS = %w[round_robin swiss single_elimination].freeze
  PHASE_KINDS = %w[regular_season playoff].freeze
  PARTICIPANT_SCOPES = %w[all_teams qualified_teams manual_selection].freeze
  ADVANCEMENT_RULES = %w[none top_n_per_group top_n_overall manual].freeze

  belongs_to :organizer_account
  has_many :phases, dependent: :nullify

  normalizes :key, with: ->(value) { value.to_s.strip.downcase }
  normalizes :name_ja, with: ->(value) { value.to_s.strip }
  normalizes :name_en, with: ->(value) { value.to_s.strip }

  validates :key, presence: true, uniqueness: { scope: :organizer_account_id }, format: { with: /\A[a-z0-9][a-z0-9_-]*\z/ }
  validates :name_ja, presence: true
  validates :format, inclusion: { in: FORMATS }
  validates :phase_kind, inclusion: { in: PHASE_KINDS }
  validates :participant_scope, inclusion: { in: PARTICIPANT_SCOPES }
  validates :advancement_rule, inclusion: { in: ADVANCEMENT_RULES }

  before_validation :fill_defaults

  def display_name_en
    name_en.presence || name_ja
  end

  def bracket_format?
    format == "single_elimination"
  end

  private

  def fill_defaults
    self.name_en = name_ja if name_en.blank?
    self.key = name_en.to_s.parameterize(separator: "_") if key.blank?
    self.key = "stage_asset_#{SecureRandom.hex(4)}" if key.blank?
    self.phase_kind = bracket_format? ? "playoff" : "regular_season"
    self.participant_scope = "all_teams" if participant_scope.blank?
    self.advancement_rule = "none" if advancement_rule.blank?
  end
end
