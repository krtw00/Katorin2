class MatchScheduleCandidatesController < ApplicationController
  before_action :admin_or_above!
  before_action :set_match
  before_action :set_candidate

  def accept
    MatchSchedules::Acceptor.new(@match, @candidate).accept!
    redirect_to match_path(@match), notice: t("flash.match_schedule_candidates.accepted")
  rescue MatchSchedules::Acceptor::NotEligibleError => error
    redirect_to match_path(@match), alert: error.message
  end

  private

  def set_match
    @match = Match.joins(:league)
      .where(id: params[:match_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
  end

  def set_candidate
    @candidate = @match.schedule_candidates.find(params[:id])
  end
end
