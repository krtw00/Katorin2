class PhasesController < ApplicationController
  before_action :set_league
  before_action :set_phase, only: %i[show edit update]

  def show
    @weeks = @phase.weeks.includes(matches: %i[home_team away_team]).order(:position)
    @blocks = @phase.blocks.order(:position)
  end

  def new
    @phase = @league.phases.new(position: next_position)
  end

  def create
    @phase = @league.phases.new(phase_params)

    if @phase.save
      redirect_to league_phase_path(league_id: @league, id: @phase), notice: t("flash.phases.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @phase.update(phase_params)
      redirect_to league_phase_path(league_id: @league, id: @phase), notice: t("flash.phases.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:league_id])
  end

  def set_phase
    @phase = @league.phases.find(params[:id])
  end

  def phase_params
    params.require(:phase).permit(:name, :kind, :position, :rule_module_key, :ranking_rule_key, :bracket_enabled)
  end

  def next_position
    @league.phases.maximum(:position).to_i + 1
  end
end
