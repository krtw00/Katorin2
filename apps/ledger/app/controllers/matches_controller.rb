class MatchesController < ApplicationController
  before_action :set_week
  before_action :set_match, only: %i[show edit update]
  before_action :set_form_collections, only: %i[new create edit update]

  def show
    @match_result = @match.match_result
    @rounds = @match.rounds.includes(:board_results).order(:number)
  end

  def new
    @match = @week.matches.new(
      league: @week.league,
      phase: @week.phase,
      status: "draft",
      export_status: "pending"
    )
  end

  def create
    @match = @week.matches.new(match_params.merge(league: @week.league, phase: @week.phase))

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
      .includes(:league, :phase, :week, :block, :home_team, :away_team, :exports)
      .first!

    @week ||= @match.week
  end

  def set_form_collections
    league = @week&.league || @match.league
    phase = @week&.phase || @match.phase
    @team_options = league.teams.order(:display_name)
    @block_options = phase.blocks.order(:position)
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
      :stage_key,
      :bracket_slot,
      :status,
      :export_status,
      :notes
    )
  end
end
