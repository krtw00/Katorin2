class Match < ApplicationRecord
  STATUSES = {
    draft: "draft",
    scheduled: "scheduled",
    in_progress: "in_progress",
    result_pending: "result_pending",
    confirmed: "confirmed",
    cancelled: "cancelled",
  }.freeze

  belongs_to :league
  belongs_to :phase
  belongs_to :week, optional: true
  belongs_to :bracket_round, optional: true
  belongs_to :block, optional: true
  belongs_to :home_team, class_name: "Team", optional: true
  belongs_to :away_team, class_name: "Team", optional: true
  belongs_to :home_source_match, class_name: "Match", optional: true
  belongs_to :away_source_match, class_name: "Match", optional: true
  belongs_to :home_loser_source_match, class_name: "Match", optional: true
  belongs_to :away_loser_source_match, class_name: "Match", optional: true

  has_one :match_result, dependent: :destroy
  has_many :rounds, -> { order(:number) }, dependent: :destroy
  has_many :exports, dependent: :destroy
  has_many :match_lineup_members, -> { order(:side, :role, :slot_number, :created_at) }, dependent: :destroy

  enum :status, STATUSES, validate: true

  validates :slot_number, presence: true, uniqueness: { scope: :bracket_round_id }, if: :bracket_match?
  validate :teams_present_for_regular_match
  validate :teams_locked_after_result, if: :teams_changed?
  validate :distinct_teams

  def destroyable?
    return false if bracket_match?

    league.draft_status? || (match_result.blank? && rounds.none?)
  end

  def destroy_for_management!
    destroy!
  end

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

    team = side.to_s == "home" ? home_team : away_team
    return Participant.none if team.blank?

    team.participants.order(:position, :created_at)
  end

  def bracket_match?
    bracket_round_id.present?
  end

  def bracket_slot_label
    return I18n.t("bracket_rounds.third_place") if bracket_round&.third_place?

    bracket_slot.presence || "R#{bracket_round&.position}-#{slot_number}"
  end

  def display_name
    [home_team&.display_name, away_team&.display_name].compact.join(" #{I18n.t('labels.vs')} ").presence || bracket_slot_label
  end

  def ready_for_result_entry?
    home_team.present? && away_team.present?
  end

  private

  def teams_present_for_regular_match
    return if bracket_match?
    return if home_team.present? && away_team.present?

    errors.add(:base, I18n.t("matches.errors.teams_required"))
  end

  def teams_locked_after_result
    return unless match_result.present?
    return if match_result.decision_type == "bye"

    errors.add(:base, I18n.t("matches.errors.teams_locked_after_result"))
  end

  def teams_changed?
    will_save_change_to_home_team_id? || will_save_change_to_away_team_id?
  end

  def distinct_teams
    return if home_team_id.blank? || away_team_id.blank?
    return unless home_team_id == away_team_id

    errors.add(:away_team_id, "must differ from home_team_id")
  end
end
