class Week < ApplicationRecord
  KINDS = {
    regular: "regular",
    playoff: "playoff",
  }.freeze

  belongs_to :league
  belongs_to :phase

  has_many :matches, dependent: :destroy

  enum :kind, KINDS, validate: true

  before_validation :assign_name

  validates :number, :name, :position, presence: true
  validates :number, uniqueness: { scope: :phase_id }
  validates :position, uniqueness: { scope: :phase_id }

  def display_name
    I18n.t("weeks.reference", number:)
  end

  private

  def assign_name
    return if number.blank?

    self.name = display_name
  end
end
