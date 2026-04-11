class MatchExportsController < ApplicationController
  before_action :set_match

  def download
    export_manager = MatchExports::ResultCardExportManager.new(@match)
    @export = export_manager.downloadable_export

    if @export.present?
      return send_export_file(disposition: :attachment)
    end

    export_manager.enqueue_refresh!
    redirect_to match_path(id: @match), notice: export_pending_message(export_manager.state)
  rescue StandardError => error
    Rails.logger.error("Match export failed for #{@match.id}: #{error.class}: #{error.message}")
    redirect_to match_path(id: @match), alert: export_error_message(error)
  end

  private

  def set_match
    @match = Match.joins(:league)
      .where(id: params[:match_id], leagues: { organizer_account_id: current_organizer_account.id })
      .includes(
        :league,
        :phase,
        :week,
        :match_result,
        :home_team,
        :away_team,
        { exports: [] },
        rounds: [:winner_team, { board_results: %i[home_participant away_participant] }]
      )
      .first!
  end

  def send_export_file(disposition:)
    absolute_path = Rails.root.join("public", @export.file_path.delete_prefix("/"))
    raise ActiveRecord::RecordNotFound unless absolute_path.exist?

    send_file(
      absolute_path,
      type: "image/png",
      disposition: disposition,
      filename: safe_filename
    )
  end

  def safe_filename
    home = @match.home_team.display_name.to_s.parameterize.presence || "home"
    away = @match.away_team.display_name.to_s.parameterize.presence || "away"
    "#{home}-vs-#{away}.png"
  end

  def export_error_message(error)
    case error
    when Ferrum::TimeoutError
      t("flash.matches.export_timeout")
    else
      t("flash.matches.export_failed")
    end
  end

  def export_pending_message(state)
    case state.to_sym
    when :stale
      t("flash.matches.export_refresh_started")
    else
      t("flash.matches.export_generation_started")
    end
  end
end
