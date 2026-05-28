class MatchScheduleCandidate < ApplicationRecord
  STATUSES = {
    proposed: "proposed",
    accepted: "accepted",
    withdrawn: "withdrawn",
  }.freeze

  belongs_to :match
  belongs_to :submitter_team, class_name: "Team"

  enum :status, STATUSES, validate: true

  validates :starts_at, presence: true
  validates :submitter_tz, presence: true
  validate :submitter_tz_is_valid_iana
  validate :submitter_team_belongs_to_match

  scope :active, -> { where(status: %w[proposed accepted]) }

  # 投稿者の TZ で表示するための ActiveSupport::TimeZone を返す。 不正値は UTC fallback。
  def starts_at_in_submitter_tz
    return nil if starts_at.blank?

    tz = ActiveSupport::TimeZone[submitter_tz] || ActiveSupport::TimeZone["UTC"]
    starts_at.in_time_zone(tz)
  end

  private

  def submitter_tz_is_valid_iana
    return if submitter_tz.blank?
    return if ActiveSupport::TimeZone[submitter_tz].present?

    errors.add(:submitter_tz, :invalid)
  end

  def submitter_team_belongs_to_match
    return if match.blank? || submitter_team.blank?
    return if [match.home_team_id, match.away_team_id].include?(submitter_team_id)

    errors.add(:submitter_team_id, :not_in_match)
  end
end
