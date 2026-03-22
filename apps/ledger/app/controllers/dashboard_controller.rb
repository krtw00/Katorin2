class DashboardController < ApplicationController
  def show
    @leagues = current_organizer_account.leagues.order(created_at: :desc)
    @today = Date.current
    base_scope = Match.joins(:league)
      .where(leagues: { organizer_account_id: current_organizer_account.id })
      .includes(:phase, :week, :home_team, :away_team)

    @today_matches = base_scope.where(scheduled_on: @today).order(:scheduled_time)
    @result_pending_matches = base_scope.result_pending.order(:scheduled_on, :scheduled_time)
  end
end
