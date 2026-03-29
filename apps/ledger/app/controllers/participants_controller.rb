class ParticipantsController < ApplicationController
  before_action :set_league
  before_action :set_team
  before_action :set_participant, only: %i[edit update destroy]
  before_action :admin_or_above!, only: %i[new create edit update destroy]

  def new
    @participant = @team.participants.new(status: "active")
  end

  def create
    @participant = @team.participants.new(participant_params)
    @participant.league = @league

    if @participant.save
      redirect_to league_team_path(league_id: @league, id: @team), notice: t("flash.participants.created")
    else
      @participants = @team.participants.order(:position, :created_at)
      render "teams/show", status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @participant.update(participant_params)
      redirect_to league_team_path(league_id: @league, id: @team), notice: t("flash.participants.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    unless @participant.destroyable?
      return redirect_to league_team_path(league_id: @league, id: @team), alert: t("flash.participants.delete_blocked")
    end

    @participant.destroy_for_management!
    redirect_to league_team_path(league_id: @league, id: @team), notice: t("flash.participants.deleted")
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:league_id])
  end

  def set_team
    @team = @league.teams.find(params[:team_id])
  end

  def set_participant
    @participant = @team.participants.find(params[:id])
  end

  def participant_params
    params.require(:participant).permit(:display_name, :member_id, :position, :status, :notes)
  end
end
