class Participant < ApplicationRecord
  PARTICIPANT_ROLES = { leader: "leader", sub_leader: "sub_leader", member: "member" }.freeze

  belongs_to :league
  belongs_to :team

  has_many :home_board_results, class_name: "BoardResult", foreign_key: :home_participant_id, dependent: :nullify
  has_many :away_board_results, class_name: "BoardResult", foreign_key: :away_participant_id, dependent: :nullify

  enum :participant_role, PARTICIPANT_ROLES, validate: true

  before_validation :assign_name
  before_validation :assign_position, on: :create

  validates :name, :display_name, presence: true

  def destroyable?
    league.draft_status? || (home_board_results.none? && away_board_results.none?)
  end

  def destroy_for_management!
    destroy!
  end

  private

  def assign_name
    self.name = display_name.to_s.strip if name.blank? && display_name.present?
  end

  def assign_position
    return if position.present? || team.blank?

    self.position = team.participants.maximum(:position).to_i + 1
  end
end
