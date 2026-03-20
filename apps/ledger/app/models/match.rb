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

  enum :status, STATUSES, validate: true
  enum :export_status, EXPORT_STATUSES, validate: true

  validates :home_team, :away_team, presence: true
  validate :distinct_teams

  private

  def distinct_teams
    return if home_team_id.blank? || away_team_id.blank?
    return unless home_team_id == away_team_id

    errors.add(:away_team_id, "must differ from home_team_id")
  end
end
