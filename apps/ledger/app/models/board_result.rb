class BoardResult < ApplicationRecord
  RESULT_STATUSES = MatchResult::RESULT_STATUSES
  WINNER_SIDES = {
    home: "home",
    away: "away",
  }.freeze

  belongs_to :round
  belongs_to :home_participant, class_name: "Participant", optional: true
  belongs_to :away_participant, class_name: "Participant", optional: true

  enum :result_status, RESULT_STATUSES, validate: true
  enum :winner_side, WINNER_SIDES, validate: true, allow_nil: true

  validates :board_number, presence: true, uniqueness: { scope: :round_id }
end
