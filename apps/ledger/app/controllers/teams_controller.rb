class TeamsController < ApplicationController
  before_action :set_league
  before_action :set_team, only: %i[show edit update destroy]
  before_action :admin_or_above!, only: %i[new create edit update destroy]

  def index
    @teams = @league.teams.includes(:participants).order(:display_name, :created_at)
  end

  def show
    @return_to = safe_return_to(params[:return_to])
    load_team_detail_state
  end

  def new
    @team = @league.teams.new(status: "active")
  end

  def create
    @team = @league.teams.new(team_params)

    if @team.save
      redirect_to league_team_path(league_id: @league, id: @team), notice: t("flash.teams.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @team.update(team_params)
      redirect_to league_team_path(league_id: @league, id: @team), notice: t("flash.teams.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @team.destroyable?
      return redirect_to league_team_path(league_id: @league, id: @team), alert: t("flash.teams.delete_blocked")
    end

    @team.destroy_for_management!
    redirect_to league_teams_path(league_id: @league), notice: t("flash.teams.deleted")
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:league_id])
  end

  def set_team
    @team = @league.teams.find(params[:id])
  end

  def load_team_detail_state
    @participants = @team.participants.order(:position, :created_at)
    @participant = @team.participants.new(status: "active")
  end

  def team_params
    params.require(:team).permit(:display_name, :status, :notes, :icon, :drop_kind)
  end

  def safe_return_to(value)
    return nil if value.blank?
    return nil unless value.start_with?("/")
    return nil if value.start_with?("//")

    value
  end
end
