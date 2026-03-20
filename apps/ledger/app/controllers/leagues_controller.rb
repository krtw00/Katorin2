class LeaguesController < ApplicationController
  before_action :set_league, only: %i[show edit update]

  def index
    @leagues = current_organizer_account.leagues.order(created_at: :desc)
  end

  def show
    @phases = @league.phases.includes(:weeks, :blocks).order(:position)
    @teams = @league.teams.includes(:participants, :block).order(:name)
    @participants = @league.participants.includes(:team).order(:display_name)
    @recent_matches = @league.matches.includes(:week, :phase, :home_team, :away_team).order(created_at: :desc).limit(12)
  end

  def new
    @league = current_organizer_account.leagues.new(rule_module_key: "wmgp", status: "draft")
  end

  def create
    @league = current_organizer_account.leagues.new(league_params)

    if @league.save
      redirect_to league_path(@league), notice: "リーグを作成しました。"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @league.update(league_params)
      redirect_to league_path(@league), notice: "リーグを更新しました。"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:id])
  end

  def league_params
    params.require(:league).permit(:name, :slug, :rule_module_key, :status, :started_at, :ended_at)
  end
end
