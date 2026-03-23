class WeeksController < ApplicationController
  before_action :set_phase
  before_action :ensure_regular_phase
  before_action :set_week, only: %i[show edit update destroy]

  def show
    @matches = @week.matches.includes(:home_team, :away_team, :block).order(:scheduled_on, :scheduled_time, :created_at)
    grouped = @matches.group_by(&:block)
    @block_sections = @phase.blocks.order(:position).map { |block| [block, grouped.delete(block) || []] }
    if grouped.key?(nil)
      @block_sections << [nil, grouped.delete(nil)]
    end
  end

  def new
    @week = @phase.weeks.new(position: next_position, number: next_number)
  end

  def create
    @week = @phase.weeks.new(week_params.merge(league: @phase.league))

    if @week.save
      redirect_to phase_week_path(phase_id: @phase, id: @week), notice: t("flash.weeks.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @week.update(week_params)
      redirect_to phase_week_path(phase_id: @phase, id: @week), notice: t("flash.weeks.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @week.destroyable?
      return redirect_to phase_week_path(phase_id: @phase, id: @week), alert: t("flash.weeks.delete_blocked")
    end

    @week.destroy_for_management!
    redirect_to league_phase_path(league_id: @phase.league, id: @phase), notice: t("flash.weeks.deleted")
  end

  private

  def set_phase
    @phase = Phase.joins(:league)
      .where(id: params[:phase_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
  end

  def set_week
    @week = @phase.weeks.find(params[:id])
  end

  def week_params
    params.require(:week).permit(:number, :position, :locked_at)
  end

  def next_position
    @phase.weeks.maximum(:position).to_i + 1
  end

  def next_number
    @phase.weeks.maximum(:number).to_i + 1
  end

  def ensure_regular_phase
    return unless @phase.bracket_phase?

    redirect_to bracket_league_phase_path(league_id: @phase.league, id: @phase), alert: t("flash.phases.regular_management_only")
  end
end
