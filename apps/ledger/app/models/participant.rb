class Participant < ApplicationRecord
  PARTICIPANT_ROLES = { leader: "leader", sub_leader: "sub_leader", member: "member" }.freeze
  MAX_MEMBER_IDS = 3

  belongs_to :league
  belongs_to :team

  has_many :match_lineup_members, dependent: :destroy
  has_many :home_board_results, class_name: "BoardResult", foreign_key: :home_participant_id, dependent: :nullify
  has_many :away_board_results, class_name: "BoardResult", foreign_key: :away_participant_id, dependent: :nullify

  enum :participant_role, PARTICIPANT_ROLES, validate: true

  before_validation :assign_name
  before_validation :assign_position, on: :create
  before_validation :sync_member_ids

  validates :name, :display_name, presence: true
  validate :member_ids_within_limit
  validate :member_ids_unique_within_league

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

  # member_ids が正、member_id は先頭 (primary) を常にミラーする。
  # CSV 経路など member_id だけ与えられた場合は member_ids に取り込む。
  def sync_member_ids
    self.member_ids = [member_id] if member_ids.blank? && member_id.present?

    cleaned = Array(member_ids).map { |id| id.to_s.strip }.reject(&:blank?)
    self.member_ids = cleaned
    self.member_id = cleaned.first
  end

  def member_ids_within_limit
    return if member_ids.size <= MAX_MEMBER_IDS

    errors.add(:member_ids, :too_many, count: MAX_MEMBER_IDS)
  end

  def member_ids_unique_within_league
    return if member_ids.blank? || league_id.blank?

    existing = Participant.where(league_id: league_id).where.not(id: id).pluck(:member_ids).flatten
    duplicated = member_ids.find { |id| existing.include?(id) } || (member_ids.uniq.size != member_ids.size && member_ids.detect { |id| member_ids.count(id) > 1 })
    return if duplicated.blank?

    errors.add(:member_ids, :duplicate, value: duplicated)
  end

  def assign_position
    return if position.present? || team.blank?

    self.position = team.participants.maximum(:position).to_i + 1
  end
end
