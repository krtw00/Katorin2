class MatchLineupMember < ApplicationRecord
  SIDES = {
    home: "home",
    away: "away",
  }.freeze

  ROLES = {
    main: "main",
    substitute: "substitute",
  }.freeze

  belongs_to :match
  belongs_to :team
  belongs_to :participant

  enum :side, SIDES, validate: true
  enum :role, ROLES, validate: true

  validates :slot_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :participant_id, uniqueness: { scope: :match_id }
  validates :slot_number, uniqueness: { scope: [:match_id, :side, :role] }
  validate :participant_belongs_to_team
  validate :team_matches_side

  scope :ordered, -> { order(:side, :role, :slot_number, :created_at) }

  private

  def participant_belongs_to_team
    return if participant.blank? || team.blank?
    return if participant.team_id == team_id

    errors.add(:participant_id, :inclusion)
  end

  def team_matches_side
    return if match.blank? || team.blank? || side.blank?

    expected_team_id = side == "home" ? match.home_team_id : match.away_team_id
    return if team_id == expected_team_id

    errors.add(:team_id, :inclusion)
  end
end
