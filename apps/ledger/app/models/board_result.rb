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
  validates :home_game_wins, :away_game_wins, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 2 }, allow_nil: true
  validate :valid_game_score_pattern

  def score_text
    return nil if home_game_wins.nil? || away_game_wins.nil?

    "#{home_game_wins} - #{away_game_wins}"
  end

  def confirmed_score?
    valid_confirmed_score?(home_game_wins, away_game_wins)
  end

  def inferred_winner_side
    self.class.infer_winner_side(home_game_wins, away_game_wins)
  end

  def self.infer_winner_side(home_game_wins, away_game_wins)
    return nil unless valid_confirmed_score?(home_game_wins, away_game_wins)

    home_game_wins > away_game_wins ? "home" : "away"
  end

  def self.valid_confirmed_score?(home_game_wins, away_game_wins)
    return false if home_game_wins.nil? || away_game_wins.nil?

    [[2, 0], [2, 1], [1, 2], [0, 2]].include?([home_game_wins, away_game_wins])
  end

  private

  def valid_game_score_pattern
    return if home_game_wins.nil? && away_game_wins.nil?
    return if self.class.valid_confirmed_score?(home_game_wins, away_game_wins)

    errors.add(:base, :invalid_game_score_pattern)
  end
end
