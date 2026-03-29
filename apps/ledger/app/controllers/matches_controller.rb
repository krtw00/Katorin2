class MatchesController < ApplicationController
  before_action :set_week
  before_action :ensure_regular_week!, only: %i[new create]
  before_action :set_match, only: %i[show edit update destroy]
  before_action :set_form_collections, only: %i[new create edit update]
  before_action :admin_or_above!, only: %i[new create edit update destroy]

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
      Brackets::ProgressionSync.new(@match).sync!
      redirect_to match_path(id: @match), notice: t("flash.matches.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  rescue Brackets::ProgressionSync::LockedError => error
    flash.now[:alert] = error.message
    render :edit, status: :unprocessable_entity
  end

  def destroy
    unless @match.destroyable?
      return redirect_to match_path(id: @match), alert: t("flash.matches.delete_blocked")
    end

    week = @match.week
    phase = @match.phase
    @match.destroy_for_management!
    redirect_to(match_redirect_path(phase, week), notice: t("flash.matches.deleted"))
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
      .includes(:league, :phase, :week, :bracket_round, :block, :home_team, :away_team, :exports, match_lineup_members: :participant)
      .first!

    @week ||= @match.week
  end

  def set_form_collections
    league = @week&.league || @match.league
    phase = @week&.phase || @match.phase
    @selected_block = selected_block || @match&.block
    @team_options = if @selected_block.present?
                      @selected_block.teams.order(:display_name)
                    else
                      league.teams.order(:display_name)
                    end
    @block_options = phase.blocks.order(:position)
  end

  def match_params
    params.require(:match).permit(
      :block_id,
      :home_team_id,
      :away_team_id,
      :scheduled_on,
      :scheduled_time,
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

  def match_redirect_path(phase, week)
    return bracket_league_phase_path(league_id: phase.league, id: phase) if week.blank?

    phase_week_path(phase_id: phase, id: week)
  end

  def ensure_regular_week!
    return unless @week&.phase&.bracket_phase?

    redirect_to bracket_league_phase_path(league_id: @week.phase.league, id: @week.phase), alert: t("flash.phases.regular_management_only")
  end
end
