module MatchExports
  class GenerateResultCardJob < ApplicationJob
    queue_as :default

    discard_on ActiveRecord::RecordNotFound

    def perform(match_id)
      match = Match.includes(
        :league,
        :phase,
        :week,
        :match_result,
        :home_team,
        :away_team,
        { exports: [] },
        { rounds: [:winner_team, { board_results: %i[home_participant away_participant] }] }
      ).find(match_id)

      ResultCardRenderer.new(match).render!
      enqueue_discord_notification(match)
    rescue StandardError => error
      Rails.logger.error("Async match export failed for #{match_id}: #{error.class}: #{error.message}")
      raise
    end

    private

    def enqueue_discord_notification(match)
      return unless match.reload.notify_discord_eligible?

      NotifyDiscordJob.perform_later(match.id)
    end
  end
end
