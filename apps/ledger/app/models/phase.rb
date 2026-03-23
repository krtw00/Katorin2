class Phase < ApplicationRecord
  KINDS = {
    regular_season: "regular_season",
    playoff: "playoff",
  }.freeze

  belongs_to :league
  belongs_to :stage_asset, optional: true

  has_many :blocks, -> { order(:position) }, dependent: :destroy
  has_many :weeks, -> { order(:position) }, dependent: :destroy
  has_many :matches, dependent: :destroy

  enum :kind, KINDS, validate: true

  before_validation :apply_stage_asset_defaults
  before_validation :assign_internal_kind
  before_validation :assign_default_rule_module_key
  before_validation :assign_default_name

  validates :name, :position, :rule_module_key, presence: true
  validates :name, uniqueness: { scope: :league_id }
  validates :position, uniqueness: { scope: :league_id }
  validates :bracket_participant_count, numericality: { only_integer: true, greater_than: 1 }, allow_nil: true

  def destroyable?
    league.draft_status? || (weeks.none? && blocks.none? && matches.none?)
  end

  def destroy_for_management!
    destroy!
  end

  def bracket_participant_count_effective
    bracket_participant_count.presence || stage_asset&.bracket_size.presence || inferred_bracket_participant_count
  end

  def bracket_size_effective
    participant_count = bracket_participant_count_effective
    return if participant_count.blank?

    size = 1
    size *= 2 while size < participant_count
    size
  end

  def bracket_bye_count
    return if bracket_size_effective.blank? || bracket_participant_count_effective.blank?

    bracket_size_effective - bracket_participant_count_effective
  end

  def bracket_phase?
    stage_asset&.bracket_format? || bracket_enabled?
  end

  private

  def assign_internal_kind
    self.kind = bracket_phase? ? "playoff" : "regular_season" if kind.blank?
  end

  def assign_default_rule_module_key
    self.rule_module_key = stage_asset&.match_rule_key.presence || stage_asset&.key.presence || "wmgp" if rule_module_key.blank?
  end

  def assign_default_name
    return if name.present?

    base_name = bracket_phase? ? I18n.t("phases.default_names.playoff") : I18n.t("phases.default_names.regular")
    suffix = position.presence || league&.phases&.maximum(:position).to_i + 1
    self.name = "#{base_name} #{suffix}"
  end

  def inferred_bracket_participant_count
    matches.select(:home_team_id, :away_team_id).flat_map { |match| [match.home_team_id, match.away_team_id] }.compact.uniq.size.presence
  end

  def apply_stage_asset_defaults
    return unless stage_asset

    self.kind = stage_asset.phase_kind
    self.rule_module_key = stage_asset.match_rule_key.presence || stage_asset.key
    self.ranking_rule_key = stage_asset.ranking_rule_key
    self.bracket_enabled = stage_asset.bracket_format?
    self.name = stage_asset.name_ja if name.blank?
  end
end
