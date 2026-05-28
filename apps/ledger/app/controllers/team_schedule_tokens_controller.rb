class TeamScheduleTokensController < ApplicationController
  before_action :admin_or_above!
  before_action :set_team

  def create
    @team.regenerate_schedule_token!
    redirect_to league_team_path(@team.league, @team),
      notice: t("flash.teams.schedule_token.created")
  end

  def destroy
    @team.revoke_schedule_token!
    redirect_to league_team_path(@team.league, @team),
      notice: t("flash.teams.schedule_token.revoked")
  end

  private

  def set_team
    league = current_organizer_account.leagues.find(params[:league_id])
    @team = league.teams.find(params[:team_id])
  end
end
