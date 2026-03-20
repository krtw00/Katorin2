class Block < ApplicationRecord
  belongs_to :league
  belongs_to :phase

  has_many :teams, dependent: :nullify
  has_many :matches, dependent: :nullify

  validates :name, :position, presence: true
  validates :name, uniqueness: { scope: :phase_id }
  validates :position, uniqueness: { scope: :phase_id }
end
