class Phase < ApplicationRecord
  KINDS = {
    regular_season: "regular_season",
    playoff: "playoff",
  }.freeze

  belongs_to :league
  belongs_to :stage_asset, optional: true

  has_many :blocks, -> { order(:position) }, dependent: :destroy
  has_many :bracket_rounds, -> { order(:position) }, dependent: :destroy
  has_many :weeks, -> { order(:position) }, dependent: :destroy
  has_many :matches, dependent: :destroy

  enum :kind, KINDS, validate: true

  before_validation :apply_stage_asset_defaults
  before_validation :assign_internal_kind
  before_validation :assign_default_rule_module_key
  before_validation :assign_default_name
  before_validation :normalize_bracket_participant_count

  validates :name, :position, :rule_module_key, presence: true
  validates :name, uniqueness: { scope: :league_id }
  validates :position, uniqueness: { scope: :league_id }
  validates :bracket_participant_count, numericality: { only_integer: true, greater_than: 1 }, allow_nil: true
  validates :bracket_lane_count, inclusion: { in: [1, 2, 4] }
  validate :valid_bracket_lane_configuration

  def destroyable?
    league.draft_status? || (weeks.none? && blocks.none? && bracket_rounds.none? && matches.none?)
  end

  def destroy_for_management!
    destroy_bracket_matches_in_dependency_order!
    destroy!
  end

  def bracket_participant_count_effective
    bracket_participant_count.presence || inferred_bracket_participant_count
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

  def effective_bracket_lane_count
    bracket_phase? ? bracket_lane_count.to_i.clamp(1, 4) : 1
  end

  def effective_bracket_region_count
    effective_bracket_lane_count
  end

  def per_lane_bracket_size
    return if bracket_size_effective.blank?

    bracket_size_effective / effective_bracket_lane_count
  end

  def per_region_bracket_size
    per_lane_bracket_size
  end

  def region_round_count
    return 0 if per_region_bracket_size.blank?

    Math.log2(per_region_bracket_size).to_i
  end

  def championship_round_count
    return 0 if effective_bracket_region_count <= 1

    Math.log2(effective_bracket_region_count).to_i
  end

  def final_round_position
    return if bracket_size_effective.blank?

    region_round_count + championship_round_count
  end

  def bracket_phase?
    stage_asset&.bracket_format? || bracket_enabled?
  end

  def bracket_structure_present?
    bracket_rounds.exists?
  end

  private

  def normalize_bracket_participant_count
    self.bracket_participant_count = nil if bracket_participant_count.to_i <= 0
  end

  def assign_internal_kind
    self.kind = bracket_phase? ? "playoff" : "regular_season" if kind.blank?
  end

  def assign_default_rule_module_key
    self.rule_module_key = stage_asset&.match_rule_key.presence || stage_asset&.key.presence || ::RuleSets::Registry.default_key if rule_module_key.blank?
  end

  def assign_default_name
    return if name.present?

    base_name = stage_asset_default_name.presence || (bracket_phase? ? I18n.t("phases.default_names.playoff") : I18n.t("phases.default_names.regular"))
    self.name = next_available_name(base_name)
  end

  def inferred_bracket_participant_count
    matches.select(:home_team_id, :away_team_id).flat_map { |match| [match.home_team_id, match.away_team_id] }.compact.uniq.size.nonzero?
  end

  def apply_stage_asset_defaults
    return unless stage_asset

    self.kind = stage_asset.phase_kind
    self.rule_module_key = stage_asset.match_rule_key.presence || stage_asset.key
    self.ranking_rule_key = stage_asset.ranking_rule_key
    self.bracket_enabled = stage_asset.bracket_format?
  end

  def stage_asset_default_name
    stage_asset&.name_ja.presence || stage_asset&.display_name_en.presence
  end

  def next_available_name(base_name)
    return base_name unless league&.phases&.where.not(id: id)&.exists?(name: base_name)

    suffix = 2
    loop do
      candidate = "#{base_name} #{suffix}"
      return candidate unless league.phases.where.not(id: id).exists?(name: candidate)

      suffix += 1
    end
  end

  def destroy_bracket_matches_in_dependency_order!
    bracket_matches = matches.where.not(bracket_round_id: nil).includes(:bracket_round).to_a
    return if bracket_matches.empty?

    match_ids = bracket_matches.map(&:id)
    Match.where(home_source_match_id: match_ids).update_all(home_source_match_id: nil)
    Match.where(away_source_match_id: match_ids).update_all(away_source_match_id: nil)
    Match.where(home_loser_source_match_id: match_ids).update_all(home_loser_source_match_id: nil)
    Match.where(away_loser_source_match_id: match_ids).update_all(away_loser_source_match_id: nil)

    bracket_matches.sort_by { |match| [-match.bracket_round.position, -match.slot_number.to_i] }.each(&:destroy!)
  end

  def valid_bracket_lane_configuration
    return unless bracket_phase?
    return if bracket_participant_count_effective.blank? && bracket_participant_count.blank?
    return if bracket_size_effective.blank?

    if bracket_size_effective % effective_bracket_lane_count != 0
      errors.add(:bracket_lane_count, I18n.t("phases.errors.invalid_region_count"))
      return
    end

    if per_region_bracket_size.to_i < 2
      errors.add(:bracket_lane_count, I18n.t("phases.errors.invalid_region_count"))
    end

    if third_place_match_enabled && bracket_size_effective < 4
      errors.add(:third_place_match_enabled, I18n.t("phases.errors.third_place_requires_semifinal"))
    end
  end
end
