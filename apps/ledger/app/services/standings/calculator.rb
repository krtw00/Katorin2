module Standings
  class Calculator
    # @param phase [Phase] 対象フェーズ
    # @return [Hash<Integer, Array<Hash>>] block_id => [team_standing, ...]
    def self.call(phase)
      new(phase).call
    end

    def initialize(phase)
      @phase = phase
    end

    def call
      # 1. フェーズのマッチと関連データを一括取得
      matches = @phase.matches
        .joins(:match_result)
        .where.not(match_results: { decision_type: "bye" })
        .includes(:match_result, rounds: :board_results)

      # 2. チームごとに集計
      team_stats = Hash.new { |h, k| h[k] = empty_stats }

      matches.each do |match|
        mr = match.match_result
        next unless mr

        [match.home_team_id, match.away_team_id].compact.each do |team_id|
          is_home = (team_id == match.home_team_id)
          stats = team_stats[team_id]

          # 勝利数
          stats[:wins] += 1 if mr.winner_team_id == team_id

          # 得点・失点（ラウンド勝数）
          if is_home
            stats[:round_wins] += mr.home_round_wins.to_i
            stats[:round_losses] += mr.away_round_wins.to_i
          else
            stats[:round_wins] += mr.away_round_wins.to_i
            stats[:round_losses] += mr.home_round_wins.to_i
          end

          # ラウンド・卓レベルの集計
          match.rounds.each do |round|
            round_side = if team_id == round.home_team_id
                           :home
                         elsif team_id == round.away_team_id
                           :away
                         else
                           next
                         end

            boards_won = 0
            boards_lost = 0

            round.board_results.each do |br|
              next unless br.winner_side.present?

              if round_side == :home
                boards_won += 1 if br.winner_side == "home"
                boards_lost += 1 if br.winner_side == "away"
                stats[:game_wins] += br.home_game_wins.to_i
                stats[:game_losses] += br.away_game_wins.to_i
              else
                boards_won += 1 if br.winner_side == "away"
                boards_lost += 1 if br.winner_side == "home"
                stats[:game_wins] += br.away_game_wins.to_i
                stats[:game_losses] += br.home_game_wins.to_i
              end
            end

            stats[:board_wins] += boards_won
            stats[:board_losses] += boards_lost
          end
        end
      end

      # 3. チーム情報を取得してブロック別にまとめる
      teams = @phase.league.teams
        .where(id: team_stats.keys)
        .includes(:block)
        .index_by(&:id)

      # ブロック未割当チームも含める（ブロック内の全チームを対象）
      @phase.blocks.includes(:teams).each do |block|
        block.teams.each do |team|
          team_stats[team.id] # ensure entry exists
          teams[team.id] ||= team
        end
      end

      # 4. 順位表を構築
      standings_by_block = {}

      teams.values.group_by { |t| t.block_id }.each do |block_id, block_teams|
        next unless block_id

        rows = block_teams.map do |team|
          s = team_stats[team.id]
          points = s[:wins] * 3
          goal_diff = s[:round_wins] - s[:round_losses]
          round_board_diff = s[:board_wins] - s[:board_losses]
          match_game_diff = s[:game_wins] - s[:game_losses]

          {
            team: team,
            wins: s[:wins],
            points: points,
            round_wins: s[:round_wins],
            round_losses: s[:round_losses],
            goal_diff: goal_diff,
            round_board_diff: round_board_diff,
            match_game_diff: match_game_diff,
            board_wins_total: s[:board_wins],
            ranking_score: points * 10000 + round_board_diff * 1000 + match_game_diff * 100 + s[:board_wins] * 10
          }
        end

        # スコア降順ソート
        rows.sort_by! { |r| -r[:ranking_score] }

        # 順位付与（同スコアは同順位）
        rows.each_with_index do |row, i|
          row[:rank] = if i == 0
                         1
                       elsif row[:ranking_score] == rows[i - 1][:ranking_score]
                         rows[i - 1][:rank]
                       else
                         i + 1
                       end
        end

        standings_by_block[block_id] = rows
      end

      standings_by_block
    end

    private

    def empty_stats
      {
        wins: 0, round_wins: 0, round_losses: 0,
        board_wins: 0, board_losses: 0,
        game_wins: 0, game_losses: 0
      }
    end
  end
end
