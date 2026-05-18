module Wmgp
  module Rules
    class StandingsRanking
      WIN_POINT = 3
      WEIGHTS = [1_000_000_000_000, 1_000_000_000, 1_000_000, 1_000, 1].freeze

      def call(team_stats:, teams_by_block:)
        teams_by_block.each_with_object({}) do |(block_id, teams), result|
          rows = teams.map { |team| build_row(team, team_stats[team.id]) }
          sort_and_rank!(rows)
          result[block_id] = rows
        end
      end

      private

      def build_row(team, stats)
        points = stats.wins * WIN_POINT
        goal_diff = stats.round_wins - stats.round_losses
        round_board_diff = stats.board_wins - stats.board_losses
        match_game_diff = stats.game_wins - stats.game_losses

        ranking_values = [
          points,
          goal_diff,
          round_board_diff,
          match_game_diff,
          stats.board_wins
        ]

        {
          team: team,
          wins: stats.wins,
          points: points,
          round_wins: stats.round_wins,
          round_losses: stats.round_losses,
          goal_diff: goal_diff,
          round_board_diff: round_board_diff,
          match_game_diff: match_game_diff,
          board_wins_total: stats.board_wins,
          ranking_values: ranking_values,
          ranking_score: weighted_ranking_score(ranking_values)
        }
      end

      def sort_and_rank!(rows)
        rows.sort_by! { |row| row[:ranking_values].map { |value| -value } }

        rows.each_with_index do |row, index|
          row[:rank] = if index.zero?
                         1
                       elsif row[:ranking_values] == rows[index - 1][:ranking_values]
                         rows[index - 1][:rank]
                       else
                         index + 1
                       end
        end
      end

      def weighted_ranking_score(values)
        values.zip(WEIGHTS).sum { |value, weight| value * weight }
      end
    end
  end
end
