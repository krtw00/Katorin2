class TeamSchedulePortalController < ApplicationController
  allow_unauthenticated_access only: %i[show create_candidate withdraw_candidate]
  skip_before_action :require_member_selection, raise: false
  skip_before_action :require_organizer_setup, raise: false

  before_action :set_team_from_token
  before_action :set_match, only: %i[create_candidate withdraw_candidate]

  def show
    @upcoming_matches = @team.all_matches
      .includes(:league, :phase, :week, :home_team, :away_team, schedule_candidates: :submitter_team, accepted_schedule_candidate: :submitter_team)
      .order(Arel.sql("COALESCE(matches.scheduled_on, '9999-12-31') ASC"))
  end

  def create_candidate
    starts_at = parse_starts_at(params.dig(:candidate, :starts_at), params.dig(:candidate, :submitter_tz))
    candidate = @match.schedule_candidates.new(
      submitter_team: @team,
      starts_at: starts_at,
      submitter_tz: params.dig(:candidate, :submitter_tz).to_s.presence,
      notes: params.dig(:candidate, :notes).to_s.presence
    )

    if candidate.save
      redirect_to team_schedule_portal_path(token: @team.schedule_token),
        notice: t("flash.team_schedule_portal.candidate_created")
    else
      redirect_to team_schedule_portal_path(token: @team.schedule_token),
        alert: candidate.errors.full_messages.to_sentence
    end
  end

  def withdraw_candidate
    candidate = @match.schedule_candidates.find(params[:id])
    unless candidate.submitter_team_id == @team.id
      return redirect_to(team_schedule_portal_path(token: @team.schedule_token),
        alert: t("flash.team_schedule_portal.cannot_withdraw_other_team"))
    end
    unless candidate.proposed?
      return redirect_to(team_schedule_portal_path(token: @team.schedule_token),
        alert: t("flash.team_schedule_portal.cannot_withdraw_accepted"))
    end

    candidate.update!(status: "withdrawn")
    redirect_to team_schedule_portal_path(token: @team.schedule_token),
      notice: t("flash.team_schedule_portal.candidate_withdrawn")
  end

  private

  def set_team_from_token
    token = params[:token].to_s
    @team = Team.find_by(schedule_token: token) if token.present?
    head :not_found unless @team
  end

  def set_match
    @match = @team.all_matches.find(params[:match_id])
  end

  def parse_starts_at(raw, tz_name)
    return nil if raw.blank?

    tz = ActiveSupport::TimeZone[tz_name.to_s] || ActiveSupport::TimeZone["UTC"]
    Time.use_zone(tz) { Time.zone.parse(raw.to_s) }&.utc
  rescue ArgumentError
    nil
  end
end
