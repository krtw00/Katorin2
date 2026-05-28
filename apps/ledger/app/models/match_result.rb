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

  PENALTY_SIDES = {
    home: "home",
    away: "away",
  }.freeze

  # decision_type が forfeit_match / disqualification のとき、 没収を「受けた」 = 負け側を示す。
  # WMGP では penalty_side のチームに 0-2 + goal_diff -1、 相手側に 2-0 を割り当てる。
  PENALTY_REQUIRED_DECISIONS = %w[forfeit_match disqualification].freeze

  belongs_to :match
  belongs_to :winner_team, class_name: "Team", optional: true

  enum :result_status, RESULT_STATUSES, validate: true
  enum :decision_type, DECISION_TYPES, default: :normal, validate: true

  validates :home_round_wins, :away_round_wins, numericality: { greater_than_or_equal_to: 0 }
  validates :penalty_side, inclusion: { in: PENALTY_SIDES.values }, allow_nil: true
  validate :penalty_side_matches_decision_type

  private

  def penalty_side_matches_decision_type
    if PENALTY_REQUIRED_DECISIONS.include?(decision_type)
      errors.add(:penalty_side, :blank) if penalty_side.blank?
    elsif penalty_side.present?
      errors.add(:penalty_side, :must_be_blank)
    end
  end
end
