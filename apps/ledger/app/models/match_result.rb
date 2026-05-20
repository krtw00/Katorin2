class MatchResult < ApplicationRecord
  RESULT_STATUSES = {
    partial: "partial",
    confirmed: "confirmed",
    void: "void",
  }.freeze

  DECISION_TYPES = {
    normal: "normal",
    bye: "bye",
    forfeit_match: "forfeit_match",
    disqualification: "disqualification",
    no_game: "no_game",
  }.freeze

  belongs_to :match
  belongs_to :winner_team, class_name: "Team", optional: true

  enum :result_status, RESULT_STATUSES, validate: true
  enum :decision_type, DECISION_TYPES, default: :normal, validate: true

  validates :home_round_wins, :away_round_wins, numericality: { greater_than_or_equal_to: 0 }
end
