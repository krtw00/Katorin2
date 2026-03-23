class BracketRound < ApplicationRecord
  ROUND_KINDS = {
    championship: "championship",
    lane: "lane",
    third_place: "third_place",
  }.freeze

  attribute :round_kind, :string
  attribute :lane_number, :integer

  belongs_to :phase

  has_many :matches, -> { order(:slot_number) }, dependent: :nullify

  enum :round_kind, ROUND_KINDS, validate: true

  validates :position, presence: true
  validates :position, uniqueness: { scope: %i[phase_id round_kind lane_number] }

  def match_count
    matches.size
  end

  def display_name
    return I18n.t("bracket_rounds.third_place") if third_place?
    return I18n.t("bracket_rounds.final") if championship? && match_count == 1

    entrants = entrant_count
    return I18n.t("bracket_rounds.final") if entrants == 2
    return I18n.t("bracket_rounds.semifinal") if entrants == 4
    return I18n.t("bracket_rounds.quarterfinal") if entrants == 8

    I18n.t("bracket_rounds.top", count: entrants)
  end

  def entrant_count
    return 2 if third_place?
    return match_count * 2 if championship?

    base_size = lane? ? phase.per_region_bracket_size.to_i : phase.bracket_size_effective.to_i
    base_size / (2**(position - 1))
  end

  def championship?
    round_kind == "championship"
  end

  def lane?
    round_kind == "lane"
  end

  def region?
    lane?
  end

  def third_place?
    round_kind == "third_place"
  end
end
