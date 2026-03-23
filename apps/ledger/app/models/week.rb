class Week < ApplicationRecord
  KINDS = {
    regular: "regular",
    playoff: "playoff",
  }.freeze

  belongs_to :league
  belongs_to :phase

  has_many :matches, dependent: :destroy

  enum :kind, KINDS, validate: true

  before_validation :assign_kind
  before_validation :assign_name

  validates :number, :name, :position, presence: true
  validates :number, uniqueness: { scope: :phase_id }
  validates :position, uniqueness: { scope: :phase_id }

  def display_name
    I18n.t("weeks.reference", number:)
  end

  def destroyable?
    league.draft_status? || matches.none?
  end

  def destroy_for_management!
    destroy!
  end

  private

  def assign_kind
    self.kind = phase&.bracket_phase? ? "playoff" : "regular" if kind.blank?
  end

  def assign_name
    return if number.blank?

    self.name = display_name
  end
end
