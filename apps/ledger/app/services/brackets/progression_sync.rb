module Brackets
  class ProgressionSync
    class LockedError < StandardError; end

    def initialize(match)
      @match = match
    end

    def sync!
      return unless match.bracket_match?

      Match.transaction do
        apply_bye_result!
        propagate_winner!
      end
    end

    private

    attr_reader :match

    def apply_bye_result!
      unless exactly_one_team_present?
        clear_bye_result!
        return
      end

      result = match.match_result || match.build_match_result
      result.home_round_wins = bye_winner == match.home_team ? 2 : 0
      result.away_round_wins = bye_winner == match.away_team ? 2 : 0
      result.winner_team = bye_winner
      result.result_status = "confirmed"
      result.decision_type = "bye"
      result.confirmed_at = Time.current
      result.save!

      match.update!(status: "confirmed")
    end

    def clear_bye_result!
      return unless match.match_result&.decision_type == "bye"

      match.match_result.destroy!
      match.update!(status: "draft")
    end

    def propagate_winner!
      [
        [:home_source_match_id, :home_team, winner_team_for_progression],
        [:away_source_match_id, :away_team, winner_team_for_progression],
        [:home_loser_source_match_id, :home_team, loser_team_for_progression],
        [:away_loser_source_match_id, :away_team, loser_team_for_progression],
      ].each do |source_column, team_column, team_value|
        downstream_matches.each do |downstream|
          next unless downstream.public_send(source_column) == match.id

          raise LockedError, I18n.t("flash.matches.bracket_progress_locked") if downstream.match_result.present?

          downstream.update!(team_column => team_value)
        end
      end
    end

    def downstream_matches
      phase.matches.where(home_source_match_id: match.id)
        .or(phase.matches.where(away_source_match_id: match.id))
        .or(phase.matches.where(home_loser_source_match_id: match.id))
        .or(phase.matches.where(away_loser_source_match_id: match.id))
    end

    def winner_team_for_progression
      confirmed_winner = match.match_result if match.match_result&.result_status == "confirmed"
      return confirmed_winner.winner_team if confirmed_winner&.winner_team.present?
      return bye_winner if bye_winner.present?

      nil
    end

    def loser_team_for_progression
      return nil unless match.match_result&.result_status == "confirmed"
      return nil if bye_winner.present?

      return match.away_team if match.match_result.winner_team_id == match.home_team_id
      return match.home_team if match.match_result.winner_team_id == match.away_team_id

      nil
    end

    def bye_winner
      return nil unless exactly_one_team_present?

      match.home_team.presence || match.away_team.presence
    end

    def exactly_one_team_present?
      [match.home_team.present?, match.away_team.present?].count(true) == 1
    end

    def phase
      match.phase
    end
  end
end
