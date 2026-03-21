class Phase < ApplicationRecord
  KINDS = {
    regular_season: "regular_season",
    playoff: "playoff",
  }.freeze

  belongs_to :league

  has_many :blocks, -> { order(:position) }, dependent: :destroy
  has_many :weeks, -> { order(:position) }, dependent: :destroy
  has_many :matches, dependent: :destroy

  enum :kind, KINDS, validate: true

  validates :name, :position, :rule_module_key, presence: true
  validates :name, uniqueness: { scope: :league_id }
  validates :position, uniqueness: { scope: :league_id }
end
