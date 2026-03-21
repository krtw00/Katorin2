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

  validates :name, :position, :rule_module_key, presence: true
  validates :name, uniqueness: { scope: :league_id }
  validates :position, uniqueness: { scope: :league_id }

  def destroyable?
    league.draft_status? || (weeks.none? && blocks.none? && matches.none?)
  end

  def destroy_for_management!
    destroy!
  end

  private

  def apply_stage_asset_defaults
    return unless stage_asset

    self.kind = stage_asset.phase_kind
    self.rule_module_key = stage_asset.match_rule_key.presence || stage_asset.key
    self.ranking_rule_key = stage_asset.ranking_rule_key
    self.bracket_enabled = stage_asset.format_playoff?
    self.name = stage_asset.name_ja if name.blank?
  end
end
