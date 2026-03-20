class MatchResult < ApplicationRecord
  RESULT_STATUSES = {
    partial: "partial",
    confirmed: "confirmed",
    void: "void",
  }.freeze

  belongs_to :match
  belongs_to :winner_team, class_name: "Team", optional: true

  enum :result_status, RESULT_STATUSES, validate: true

  validates :home_round_wins, :away_round_wins, numericality: { greater_than_or_equal_to: 0 }
end
