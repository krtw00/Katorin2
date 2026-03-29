class BlocksController < ApplicationController
  before_action :set_phase
  before_action :ensure_regular_phase
  before_action :set_block, only: %i[show edit update destroy assign_team unassign_team]
  before_action :load_show_collections, only: :show
  before_action :admin_or_above!, only: %i[new create edit update destroy assign_team unassign_team]

  def show
  end

  def new
    @block = @phase.blocks.new(position: next_position)
  end

  def create
    @block = @phase.blocks.new(block_params.merge(league: @phase.league))
    @block.position ||= next_position

    if @block.save
      redirect_to league_phase_path(league_id: @phase.league, id: @phase), notice: t("flash.blocks.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @block.update(block_params)
      redirect_to league_phase_path(league_id: @phase.league, id: @phase), notice: t("flash.blocks.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @block.destroyable?
      return redirect_to league_phase_path(league_id: @phase.league, id: @phase), alert: t("flash.blocks.delete_blocked")
    end

    @block.destroy_for_management!
    redirect_to league_phase_path(league_id: @phase.league, id: @phase), notice: t("flash.blocks.deleted")
  end

  def assign_team
    team = @phase.league.teams.where(block_id: nil).find(params[:team_id])
    team.update!(block: @block)

    redirect_to phase_block_path(phase_id: @phase, id: @block), notice: t("flash.blocks.team_assigned")
  end

  def unassign_team
    team = @block.teams.find(params[:team_id])
    team.update!(block: nil)

    redirect_to phase_block_path(phase_id: @phase, id: @block), notice: t("flash.blocks.team_unassigned")
  end

  private

  def set_phase
    @phase = Phase.joins(:league)
      .where(id: params[:phase_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
  end

  def set_block
    @block = @phase.blocks.find(params[:id])
  end

  def block_params
    params.require(:block).permit(:name, :position)
  end

  def load_show_collections
    @teams = @block.teams.order(:display_name)
    @available_teams = @phase.league.teams.where(block_id: nil).order(:display_name)
  end

  def next_position
    @phase.blocks.maximum(:position).to_i + 1
  end

  def ensure_regular_phase
    return unless @phase.bracket_phase?

    redirect_to league_phase_path(league_id: @phase.league, id: @phase), alert: t("flash.phases.regular_management_only")
  end
end
