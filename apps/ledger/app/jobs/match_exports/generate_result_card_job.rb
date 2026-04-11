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
    rescue StandardError => error
      Rails.logger.error("Async match export failed for #{match_id}: #{error.class}: #{error.message}")
      raise
    end
  end
end
