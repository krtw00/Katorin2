class RosterChangeRequestsController < ApplicationController
  before_action :admin_or_above!
  before_action :set_team
  before_action :set_roster_change_request, only: %i[show approve reject]

  def index
    @requests = @team.roster_change_requests.recent_first
  end

  def show
  end

  def approve
    unless @roster_change_request.pending?
      return redirect_to league_team_roster_change_request_path(league_id: @league, team_id: @team, id: @roster_change_request),
        alert: t("flash.roster_change_requests.already_reviewed")
    end

    ActiveRecord::Base.transaction do
      apply_roster_change_request!(@roster_change_request)
      @roster_change_request.update!(
        status: "approved",
        reviewed_by: current_organizer_member,
        reviewed_at: Time.current,
        organizer_note: params[:organizer_note]
      )
    end

    redirect_to league_team_roster_change_requests_path(league_id: @league, team_id: @team),
      notice: t("flash.roster_change_requests.approved")
  rescue ActiveRecord::RecordInvalid => e
    redirect_to league_team_roster_change_request_path(league_id: @league, team_id: @team, id: @roster_change_request),
      alert: t("flash.roster_change_requests.approve_failed", errors: e.record.errors.full_messages.to_sentence)
  end

  def reject
    unless @roster_change_request.pending?
      return redirect_to league_team_roster_change_request_path(league_id: @league, team_id: @team, id: @roster_change_request),
        alert: t("flash.roster_change_requests.already_reviewed")
    end

    @roster_change_request.update!(
      status: "rejected",
      reviewed_by: current_organizer_member,
      reviewed_at: Time.current,
      organizer_note: params[:organizer_note]
    )

    redirect_to league_team_roster_change_requests_path(league_id: @league, team_id: @team),
      notice: t("flash.roster_change_requests.rejected")
  end

  private

  def set_team
    @league = current_organizer_account.leagues.find(params[:league_id])
    @team = @league.teams.find(params[:team_id])
  end

  def set_roster_change_request
    @roster_change_request = @team.roster_change_requests.find(params[:id])
  end

  def apply_roster_change_request!(request)
    case request.kind
    when "add"
      @team.participants.create!(
        league: @team.league,
        display_name: request.proposed_display_name,
        member_ids: request.proposed_member_ids,
        status: "active"
      )
    when "remove"
      request.target_participant.update!(status: "withdrawn")
    when "update_md_id"
      request.target_participant.update!(member_ids: request.proposed_member_ids)
    end
  end
end
