class Team < ApplicationRecord
  belongs_to :league
  belongs_to :block, optional: true

  has_many :participants, dependent: :destroy
  has_many :home_matches, class_name: "Match", foreign_key: :home_team_id, dependent: :restrict_with_exception
  has_many :away_matches, class_name: "Match", foreign_key: :away_team_id, dependent: :restrict_with_exception

  validates :name, :display_name, presence: true
  validates :name, uniqueness: { scope: :league_id }
end
