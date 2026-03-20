class Round < ApplicationRecord
  RESULT_STATUSES = MatchResult::RESULT_STATUSES

  belongs_to :match
  belongs_to :home_team, class_name: "Team", optional: true
  belongs_to :away_team, class_name: "Team", optional: true
  belongs_to :winner_team, class_name: "Team", optional: true

  has_many :board_results, -> { order(:board_number) }, dependent: :destroy

  enum :result_status, RESULT_STATUSES, validate: true

  validates :number, presence: true, uniqueness: { scope: :match_id }
end
