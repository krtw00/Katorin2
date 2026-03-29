class MatchLineupsController < ApplicationController
  before_action :set_match
  before_action :ensure_match_ready!

  def edit
    set_lineup_state
  end

  def update
    Match.transaction do
      @match.match_lineup_members.destroy_all
      persist_side!("home", @match.home_team)
      persist_side!("away", @match.away_team)
    end
    @match.update_column(:judge_name, current_organizer_member.display_name)

    redirect_to edit_match_lineup_path(match_id: @match), notice: t("flash.matches.lineup_updated")
  rescue ActiveRecord::RecordInvalid => error
    flash.now[:alert] = error.record.errors.full_messages.to_sentence
    set_lineup_state
    render :edit, status: :unprocessable_entity
  end

  private

  def set_match
    @match = Match.joins(:league)
      .where(id: params[:match_id], leagues: { organizer_account_id: current_organizer_account.id })
      .includes(:league, :phase, :week, :bracket_round, :home_team, :away_team, :match_lineup_members, home_team: :participants, away_team: :participants)
      .first!
  end

  def set_lineup_state
    @lineup_size = @match.lineup_size.to_i
    @substitute_size = @match.substitute_size.to_i
    @home_options = @match.home_team.participants.order(:position, :created_at)
    @away_options = @match.away_team.participants.order(:position, :created_at)
    @home_entries = lineup_entries_for("home")
    @away_entries = lineup_entries_for("away")
  end

  def lineup_entries_for(side)
    existing = @match.lineup_members_for(side).index_by { |entry| [entry.role, entry.slot_number] }
    entries = []

    @lineup_size.to_i.times do |index|
      slot_number = index + 1
      entries << { role: "main", slot_number:, participant_id: existing[["main", slot_number]]&.participant_id }
    end

    @substitute_size.to_i.times do |index|
      slot_number = index + 1
      entries << { role: "substitute", slot_number:, participant_id: existing[["substitute", slot_number]]&.participant_id }
    end

    entries
  end

  def persist_side!(side, team)
    side_payload = params.dig(:lineup, side, "slots") || {}

    side_payload.each_value do |slot_payload|
      participant_id = slot_payload["participant_id"].presence
      next if participant_id.blank?

      @match.match_lineup_members.create!(
        side: side,
        team: team,
        participant_id: participant_id,
        role: slot_payload.fetch("role"),
        slot_number: slot_payload.fetch("slot_number")
      )
    end
  end

  def ensure_match_ready!
    return if @match.ready_for_result_entry?

    redirect_to edit_match_path(id: @match), alert: t("flash.matches.assign_teams_first")
  end
end
