class TeamRosterChangePortalController < ApplicationController
  allow_unauthenticated_access only: %i[show create_request]
  skip_before_action :require_member_selection, raise: false
  skip_before_action :require_organizer_setup, raise: false

  before_action :set_team_from_token

  def show
    @roster_change_request ||= @team.roster_change_requests.new
    load_show_collections
  end

  def create_request
    @roster_change_request = @team.roster_change_requests.new(request_params)

    if @roster_change_request.save
      redirect_to team_roster_change_portal_path(token: @team.roster_change_token),
        notice: t("flash.team_roster_change_portal.request_created")
    else
      load_show_collections
      render :show, status: :unprocessable_entity
    end
  end

  private

  def set_team_from_token
    token = params[:token].to_s
    @team = Team.find_by(roster_change_token: token) if token.present?
    head :not_found unless @team
  end

  def load_show_collections
    @participants = @team.participants.order(:position)
    @active_participants = @participants.reject { |participant| participant.status == "withdrawn" }
    @requests = @team.roster_change_requests.recent_first
  end

  def request_params
    attrs = params.require(:roster_change_request).permit(
      :kind,
      :submitter_display_name,
      :target_participant_id,
      :proposed_display_name,
      :note,
      proposed_member_ids: []
    )

    if attrs.key?(:proposed_member_ids)
      attrs[:proposed_member_ids] = Array(attrs[:proposed_member_ids]).map { |value| value.to_s.strip }.reject(&:blank?)
    end

    attrs
  end
end
