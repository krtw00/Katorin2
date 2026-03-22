class MatchesController < ApplicationController
  before_action :set_week
  before_action :set_match, only: %i[show edit update destroy]
  before_action :set_form_collections, only: %i[new create edit update]

  def show
    @match_result = @match.match_result
    @rounds = @match.rounds.includes(:board_results).order(:number)
  end

  def new
    @match = @week.matches.new(
      league: @week.league,
      phase: @week.phase,
      block: selected_block,
      stage_key: params[:stage_key],
      bracket_slot: params[:bracket_slot],
      status: "draft"
    )
  end

  def create
    @match = @week.matches.new(
      match_params.merge(
        league: @week.league,
        phase: @week.phase,
        block: selected_block || @week.phase.blocks.find_by(id: params.dig(:match, :block_id)),
        stage_key: params[:stage_key].presence || params.dig(:match, :stage_key).presence,
        bracket_slot: params[:bracket_slot].presence || params.dig(:match, :bracket_slot).presence
      )
    )

    if @match.save
      redirect_to match_path(id: @match), notice: t("flash.matches.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @match.update(match_params)
      redirect_to match_path(id: @match), notice: t("flash.matches.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @match.destroyable?
      return redirect_to match_path(id: @match), alert: t("flash.matches.delete_blocked")
    end

    week = @match.week
    phase = @match.phase
    @match.destroy_for_management!
    redirect_to phase_week_path(phase_id: phase, id: week), notice: t("flash.matches.deleted")
  end

  private

  def set_week
    return unless params[:week_id]

    @week = Week.joins(phase: :league)
      .where(id: params[:week_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
  end

  def set_match
    @match = Match.joins(:league)
      .where(id: params[:id], leagues: { organizer_account_id: current_organizer_account.id })
      .includes(:league, :phase, :week, :block, :home_team, :away_team, :exports, match_lineup_members: :participant)
      .first!

    @week ||= @match.week
  end

  def set_form_collections
    league = @week&.league || @match.league
    phase = @week&.phase || @match.phase
    @selected_block = selected_block || @match.block
    @team_options = if @selected_block.present?
                      @selected_block.teams.order(:display_name)
                    else
                      league.teams.order(:display_name)
                    end
    @block_options = phase.blocks.order(:position)
    @judge_options = current_organizer_account.organizer_members.where(active: true).order(:display_name).pluck(:display_name)
  end

  def match_params
    params.require(:match).permit(
      :block_id,
      :home_team_id,
      :away_team_id,
      :scheduled_on,
      :scheduled_time,
      :judge_name,
      :room_id,
      :spectator_room_id,
      :status,
      :stage_key,
      :bracket_slot,
      :notes
    )
  end

  def selected_block
    return @selected_block if defined?(@selected_block)
    return @selected_block = nil unless params[:block_id].present?

    phase = @week&.phase || @match&.phase
    @selected_block = phase&.blocks&.find_by(id: params[:block_id])
  end
end
