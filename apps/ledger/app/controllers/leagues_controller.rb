class LeaguesController < ApplicationController
  before_action :set_league, only: %i[show edit update destroy]
  before_action :admin_or_above!, only: %i[new create edit update destroy]

  def index
    @leagues = current_organizer_account.leagues.order(created_at: :desc)
  end

  def show
    @phases = @league.phases.includes(:weeks, :blocks).order(:position)
    @recent_matches = @league.matches.includes(:week, :phase, :home_team, :away_team).order(created_at: :desc).limit(12)
  end

  def new
    @league = current_organizer_account.leagues.new(status: "draft", roster_min_members: 6, roster_max_members: 15, lineup_size: 3, substitute_size: 1)
  end

  def create
    @league = current_organizer_account.leagues.new(league_params)

    if @league.save
      redirect_to league_path(id: @league), notice: t("flash.leagues.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @league.update(league_params)
      redirect_to league_path(id: @league), notice: t("flash.leagues.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @league.destroyable?
      return redirect_to league_path(id: @league), alert: t("flash.leagues.delete_blocked")
    end

    @league.destroy_for_management!
    redirect_to leagues_path, notice: t("flash.leagues.deleted")
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:id])
  end

  def league_params
    params.require(:league).permit(:name, :status, :started_at, :ended_at, :header_image, :roster_min_members, :roster_max_members, :lineup_size, :substitute_size, :discord_webhook_url)
  end
end
