class StandingsController < ApplicationController
  before_action :require_organizer_session
  before_action :set_phase

  def show
    @standings_by_block = Standings::Calculator.call(@phase)
    @blocks = @phase.blocks.order(:position).index_by(&:id)
  end

  private

  def set_phase
    @phase = Phase.joins(:league)
      .where(id: params[:phase_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
    @league = @phase.league
  end
end
