class RosterChangeRequest < ApplicationRecord
  KINDS = {
    add: "add",
    remove: "remove",
    update_md_id: "update_md_id",
  }.freeze

  STATUSES = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
  }.freeze

  belongs_to :team
  belongs_to :target_participant, class_name: "Participant", optional: true
  belongs_to :reviewed_by, class_name: "OrganizerMember", optional: true

  enum :kind, KINDS, validate: true
  enum :status, STATUSES, validate: true

  validates :submitter_display_name, presence: true
  validate :target_participant_required_for_remove_and_update
  validate :target_participant_belongs_to_team
  validate :proposed_payload_present_when_required
  validate :proposed_member_ids_within_limit

  scope :active, -> { where(status: %w[pending approved]) }
  scope :recent_first, -> { order(created_at: :desc) }

  def reviewed?
    status != "pending"
  end

  private

  def target_participant_required_for_remove_and_update
    return unless %w[remove update_md_id].include?(kind)
    errors.add(:target_participant_id, :blank) if target_participant_id.blank?
  end

  def target_participant_belongs_to_team
    return if target_participant.blank? || team.blank?
    return if target_participant.team_id == team_id

    errors.add(:target_participant_id, :not_in_team)
  end

  def proposed_payload_present_when_required
    case kind
    when "add"
      errors.add(:proposed_display_name, :blank) if proposed_display_name.blank?
    when "update_md_id"
      errors.add(:proposed_member_ids, :blank) if Array(proposed_member_ids).reject(&:blank?).empty?
    end
  end

  def proposed_member_ids_within_limit
    ids = Array(proposed_member_ids).reject(&:blank?)
    return if ids.empty?
    return if ids.size <= Participant::MAX_MEMBER_IDS

    errors.add(:proposed_member_ids, :too_many, count: Participant::MAX_MEMBER_IDS)
  end
end
