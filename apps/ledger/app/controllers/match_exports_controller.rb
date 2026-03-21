class MatchExportsController < ApplicationController
  before_action :set_match

  def create
    MatchExports::ResultCardRenderer.new(@match).render!
    redirect_to match_path(id: @match), notice: t("flash.matches.export_generated")
  rescue StandardError => error
    redirect_to match_path(id: @match), alert: t("flash.matches.export_failed", message: error.message)
  end

  private

  def set_match
    @match = Match.joins(:league)
      .where(id: params[:match_id], leagues: { organizer_account_id: current_organizer_account.id })
      .includes(
        :league,
        :phase,
        :week,
        :match_result,
        :home_team,
        :away_team,
        { exports: [] },
        rounds: [:winner_team, { board_results: %i[home_participant away_participant] }]
      )
      .first!
  end
end
