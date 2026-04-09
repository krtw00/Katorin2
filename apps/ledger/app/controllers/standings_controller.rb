class StandingsController < ApplicationController
  before_action :set_phase

  def show
    @standings_by_block = Standings::Calculator.call(@phase)
    @blocks = @phase.blocks.order(:position).index_by(&:id)
  end

  def download
    standings_by_block = Standings::Calculator.call(@phase)
    blocks = @phase.blocks.order(:position).index_by(&:id)

    renderer = StandingsExports::TableRenderer.new(@phase, standings_by_block, blocks)
    output_path = renderer.render!

    league_label = @league.slug.presence || @league.name
    filename = "standings-#{league_label}.png"
    send_file output_path, filename: filename, type: "image/png", disposition: "attachment"
  rescue => e
    Rails.logger.error("Standings export failed for phase #{@phase.id}: #{e.class}: #{e.message}")
    redirect_to league_phase_standings_path(league_id: @league, phase_id: @phase),
      alert: export_error_message(e)
  end

  private

  def set_phase
    @phase = Phase.joins(:league)
      .where(id: params[:phase_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
    @league = @phase.league
  end

  def export_error_message(error)
    case error
    when Ferrum::TimeoutError
      t("flash.standings.export_timeout")
    else
      t("flash.standings.export_failed")
    end
  end
end
