require "csv"

module Decks
  class UsageSummary
    Entry = Struct.new(:deck_name, :user_count, :wins, :losses, keyword_init: true) do
      def total
        wins + losses
      end

      def win_rate
        return nil if total.zero?

        wins.fdiv(total)
      end
    end

    CSV_HEADERS = %i[deck_name user_count wins losses win_rate].freeze

    def initialize(week)
      @week = week
    end

    def entries
      @entries ||= build_entries
    end

    def empty?
      entries.empty?
    end

    def to_csv
      ::CSV.generate do |csv|
        csv << CSV_HEADERS.map { |key| I18n.t("decks.usage.csv.#{key}") }
        entries.each do |entry|
          csv << [
            entry.deck_name,
            entry.user_count,
            entry.wins,
            entry.losses,
            entry.win_rate.nil? ? "" : format("%.3f", entry.win_rate)
          ]
        end
      end
    end

    private

    attr_reader :week

    def build_entries
      grouped = Hash.new { |hash, key| hash[key] = [] }

      board_results.find_each do |board|
        side_record(grouped, board.home_deck_name, board.home_participant_id, side_result(board, "home"))
        side_record(grouped, board.away_deck_name, board.away_participant_id, side_result(board, "away"))
      end

      grouped.map { |deck_name, sides| build_entry(deck_name, sides) }
             .sort_by { |entry| [-entry.user_count, -entry.wins, entry.deck_name] }
    end

    def build_entry(deck_name, sides)
      Entry.new(
        deck_name: deck_name,
        user_count: sides.map { |side| side[:participant_id] }.compact.uniq.size,
        wins: sides.count { |side| side[:result] == :win },
        losses: sides.count { |side| side[:result] == :loss }
      )
    end

    def board_results
      BoardResult
        .joins(round: :match)
        .where(matches: { week_id: week.id })
    end

    def side_record(hash, deck_name, participant_id, result)
      return if deck_name.blank?

      hash[deck_name] << { participant_id: participant_id, result: result }
    end

    def side_result(board, side)
      return :draw if board.winner_side.blank?

      board.winner_side == side ? :win : :loss
    end
  end
end
