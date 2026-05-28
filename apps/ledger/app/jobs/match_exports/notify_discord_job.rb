module MatchExports
  class NotifyDiscordJob < ApplicationJob
    queue_as :default

    discard_on ActiveRecord::RecordNotFound
    retry_on DiscordNotificationService::TransientError,
      wait: :polynomially_longer,
      attempts: 3

    def perform(match_id)
      match = Match.includes(:league, :match_result, :exports).find(match_id)
      DiscordNotificationService.new(match).notify
    end
  end
end
