class MatchResultEntriesController < ApplicationController
  before_action :set_match
  before_action :ensure_match_ready!
  before_action :set_result_form_state

  def edit
  end

  def update
    MatchResults::Recorder.new(@match, result_entry_params).save!
    @match.update_column(:judge_name, current_organizer_member.display_name)
    Brackets::ProgressionSync.new(@match).sync!
    export_refresh_failed = enqueue_result_card_refresh_failed?

    redirect_to(
      edit_match_result_entry_path(match_id: @match),
      notice: t("flash.matches.results_updated_with_export"),
      alert: export_refresh_failed ? t("flash.matches.export_refresh_failed_non_blocking") : nil
    )
  rescue Brackets::ProgressionSync::LockedError => error
    Rails.logger.warn("Result entry progression sync blocked for match=#{@match.id}: #{error.message}")
    flash.now[:alert] = error.message
    set_result_form_state
    render :edit, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => error
    log_record_invalid(error)
    flash.now[:alert] = error.record.errors.full_messages.to_sentence
    set_result_form_state
    render :edit, status: :unprocessable_entity
  end

  private

  def set_match
    @match = Match.joins(:league)
      .where(id: params[:match_id], leagues: { organizer_account_id: current_organizer_account.id })
      .includes(:league, :phase, :week, :bracket_round, :home_team, :away_team, :match_lineup_members, rounds: :board_results)
      .first!
  end

  def ensure_match_ready!
    return if @match.ready_for_result_entry?

    redirect_to edit_match_path(id: @match), alert: t("flash.matches.assign_teams_first")
  end

  def set_result_form_state
    @home_participant_options = @match.participant_options_for_result("home")
    @away_participant_options = @match.participant_options_for_result("away")
    @match_result = @match.match_result
    lineup_defaults = build_lineup_defaults
    @round_entries = (1..3).map do |round_number|
      round = @match.rounds.find { |existing_round| existing_round.number == round_number } || Round.new(number: round_number, result_status: "partial")
      boards = (1..3).map do |board_number|
        board = round.board_results.find { |existing_board| existing_board.board_number == board_number } || BoardResult.new(board_number: board_number, result_status: "partial")
        apply_lineup_defaults!(board, lineup_defaults[board_number])
        board
      end

      { round: round, boards: boards }
    end
  end

  def build_lineup_defaults
    @match.match_lineup_members.each_with_object({}) do |member, hash|
      next unless member.role == "main"

      hash[member.slot_number] ||= {}
      hash[member.slot_number][member.side] = member.participant_id
    end
  end

  def apply_lineup_defaults!(board, defaults)
    return if defaults.blank?

    board.home_participant_id ||= defaults["home"]
    board.away_participant_id ||= defaults["away"]
  end

  def result_entry_params
    return {} unless params[:result_entry].is_a?(ActionController::Parameters)

    params.require(:result_entry).permit!.to_h
  end

  def enqueue_result_card_refresh_failed?
    MatchExports::ResultCardExportManager.new(@match).enqueue_refresh!
    false
  rescue StandardError => error
    Rails.logger.error("Result card refresh enqueue failed for match=#{@match.id}: #{error.class}: #{error.message}")
    true
  end

  def log_record_invalid(error)
    record = error.record
    messages = record&.errors&.full_messages&.join(" / ")
    Rails.logger.warn(
      "Result entry save failed for match=#{@match.id}: #{error.class} on #{record&.class || 'unknown'}: #{messages.presence || error.message}"
    )
  end
end
