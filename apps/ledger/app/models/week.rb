class Week < ApplicationRecord
  KINDS = {
    regular: "regular",
    playoff: "playoff",
  }.freeze

  belongs_to :league
  belongs_to :phase

  has_many :matches, dependent: :destroy

  enum :kind, KINDS, validate: true

  validates :number, :name, :position, presence: true
  validates :number, uniqueness: { scope: :phase_id }
  validates :position, uniqueness: { scope: :phase_id }
end
