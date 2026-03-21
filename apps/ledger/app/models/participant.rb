class Participant < ApplicationRecord
  belongs_to :league
  belongs_to :team

  has_many :home_board_results, class_name: "BoardResult", foreign_key: :home_participant_id, dependent: :nullify
  has_many :away_board_results, class_name: "BoardResult", foreign_key: :away_participant_id, dependent: :nullify

  validates :name, :display_name, presence: true
end
