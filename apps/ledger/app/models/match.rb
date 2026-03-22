class Match < ApplicationRecord
  STATUSES = {
    draft: "draft",
    scheduled: "scheduled",
    in_progress: "in_progress",
    result_pending: "result_pending",
    confirmed: "confirmed",
    cancelled: "cancelled",
  }.freeze

  EXPORT_STATUSES = {
    not_required: "not_required",
    pending: "pending",
    generated: "generated",
    stale: "stale",
  }.freeze

  belongs_to :league
  belongs_to :phase
  belongs_to :week
  belongs_to :block, optional: true
  belongs_to :home_team, class_name: "Team"
  belongs_to :away_team, class_name: "Team"

  has_one :match_result, dependent: :destroy
  has_many :rounds, -> { order(:number) }, dependent: :destroy
  has_many :exports, dependent: :destroy
  has_many :match_lineup_members, -> { order(:side, :role, :slot_number, :created_at) }, dependent: :destroy

  enum :status, STATUSES, validate: true
  enum :export_status, EXPORT_STATUSES, validate: true

  validates :home_team, :away_team, presence: true
  validate :distinct_teams

  def lineup_size
    league.lineup_size.presence || 3
  end

  def substitute_size
    league.substitute_size.presence || 1
  end

  def lineup_members_for(side)
    match_lineup_members.select { |entry| entry.side == side.to_s }.sort_by { |entry| [entry.role == "main" ? 0 : 1, entry.slot_number] }
  end

  def lineup_participants_for(side)
    lineup_members_for(side).filter_map(&:participant)
  end

  def lineup_present_for?(side)
    lineup_members_for(side).any?
  end

  def participant_options_for_result(side)
    lineup_participants = lineup_participants_for(side)
    return lineup_participants if lineup_participants.any?

    (side.to_s == "home" ? home_team : away_team).participants.order(:position, :created_at)
  end

  private

  def distinct_teams
    return if home_team_id.blank? || away_team_id.blank?
    return unless home_team_id == away_team_id

    errors.add(:away_team_id, "must differ from home_team_id")
  end
end
