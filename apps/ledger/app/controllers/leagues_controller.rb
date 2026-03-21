class LeaguesController < ApplicationController
  before_action :set_league, only: %i[show edit update destroy]

  def index
    @leagues = current_organizer_account.leagues.order(created_at: :desc)
  end

  def show
    @phases = @league.phases.includes(:weeks, :blocks).order(:position)
    @recent_matches = @league.matches.includes(:week, :phase, :home_team, :away_team).order(created_at: :desc).limit(12)
  end

  def new
    @league = current_organizer_account.leagues.new(rule_module_key: RuleSets::Registry.default_key, status: "draft")
  end

  def create
    @league = current_organizer_account.leagues.new(league_params)
    @league.rule_module_key ||= RuleSets::Registry.default_key

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
    params.require(:league).permit(:name, :status, :started_at, :ended_at)
  end
end
