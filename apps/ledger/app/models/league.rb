class League < ApplicationRecord
  belongs_to :organizer_account

  has_many :phases, -> { order(:position) }, dependent: :destroy
  has_many :blocks, dependent: :destroy
  has_many :teams, dependent: :destroy
  has_many :participants, dependent: :destroy
  has_many :weeks, dependent: :destroy
  has_many :matches, dependent: :destroy
  has_many :exports, dependent: :destroy

  validates :name, :slug, :rule_module_key, presence: true
  validates :slug, uniqueness: true
end
