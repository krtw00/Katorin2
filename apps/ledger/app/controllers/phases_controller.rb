class PhasesController < ApplicationController
  before_action :set_league
  before_action :set_phase, only: %i[show edit update destroy bracket edit_bracket update_bracket]
  before_action :ensure_bracket_phase, only: %i[edit_bracket update_bracket]

  def show
    @weeks = @phase.weeks.includes(matches: %i[home_team away_team]).order(:position)
    @blocks = @phase.blocks.includes(:teams, :matches).order(:position)
  end

  def bracket
    @weeks = @phase.weeks.includes(matches: %i[home_team away_team match_result]).order(:position)
    @bracket = Brackets::PhaseLayout.new(@phase, routes: view_context).build
  end

  def new
    @phase = @league.phases.new(position: next_position, stage_asset: default_stage_asset)
  end

  def create
    @phase = @league.phases.new(phase_params)
    @phase.position ||= next_position

    if @phase.save
      redirect_to league_phase_path(league_id: @league, id: @phase), notice: t("flash.phases.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def edit_bracket
  end

  def update
    if @phase.update(phase_params)
      redirect_to league_phase_path(league_id: @league, id: @phase), notice: t("flash.phases.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def update_bracket
    if @phase.update(bracket_phase_params)
      redirect_to league_phase_path(league_id: @league, id: @phase), notice: t("flash.phases.updated")
    else
      render :edit_bracket, status: :unprocessable_entity
    end
  end

  def destroy
    unless @phase.destroyable?
      return redirect_to league_phase_path(league_id: @league, id: @phase), alert: t("flash.phases.delete_blocked")
    end

    @phase.destroy_for_management!
    redirect_to league_path(id: @league), notice: t("flash.phases.deleted")
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:league_id])
  end

  def set_phase
    @phase = @league.phases.find(params[:id])
  end

  def phase_params
    params.require(:phase).permit(:name, :stage_asset_id)
  end

  def bracket_phase_params
    params.require(:phase).permit(:bracket_participant_count)
  end

  def next_position
    @league.phases.maximum(:position).to_i + 1
  end

  def default_stage_asset
    current_organizer_account.ensure_default_stage_assets!
    current_organizer_account.stage_assets.where(active: true).order(:created_at).first
  end

  def ensure_bracket_phase
    return if @phase.bracket_enabled?

    redirect_to league_phase_path(league_id: @league, id: @phase), alert: t("flash.phases.bracket_not_available")
  end
end
