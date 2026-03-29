class TeamImportsController < ApplicationController
  before_action :set_league
  before_action :admin_or_above!

  def new
    @team_import = TeamImport.new(league: @league)
  end

  def create
    @team_import = TeamImport.new(league: @league, file: params.dig(:team_import, :file))

    if @team_import.save
      redirect_to league_teams_path(league_id: @league), notice: t(
        "flash.team_imports.created",
        created_teams: @team_import.created_team_count,
        updated_teams: @team_import.updated_team_count,
        created_participants: @team_import.created_participant_count,
        updated_participants: @team_import.updated_participant_count
      )
    else
      render :new, status: :unprocessable_entity
    end
  end

  def template
    send_data "\uFEFF#{TeamImport.template_csv(locale: I18n.locale)}",
              filename: "team-import-template.csv",
              type: "text/csv; charset=utf-8",
              disposition: :attachment
  end

  private

  def set_league
    @league = current_organizer_account.leagues.find(params[:league_id])
  end
end
