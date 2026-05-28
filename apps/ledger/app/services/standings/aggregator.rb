module Standings
  class Aggregator
    Stats = Struct.new(
      :wins, :round_wins, :round_losses,
      :board_wins, :board_losses,
      :game_wins, :game_losses,
      :forfeit_count,
      keyword_init: true
    ) do
      def self.zero
        new(
          wins: 0, round_wins: 0, round_losses: 0,
          board_wins: 0, board_losses: 0,
          game_wins: 0, game_losses: 0,
          forfeit_count: 0
        )
      end
    end

    Aggregation = Struct.new(:team_stats, :teams_by_block, keyword_init: true)

    def self.call(phase)
      new(phase).call
    end

    def initialize(phase)
      @phase = phase
    end

    def call
      team_stats = Hash.new { |hash, key| hash[key] = Stats.zero }
      collect_match_stats(team_stats)

      teams_by_block = build_teams_by_block(team_stats)

      Aggregation.new(team_stats: team_stats, teams_by_block: teams_by_block)
    end

    private

    attr_reader :phase

    def collect_match_stats(team_stats)
      matches = phase.matches
        .joins(:match_result)
        .where.not(match_results: { decision_type: %w[bye no_game] })
        .includes(:match_result, rounds: :board_results)

      matches.each do |match|
        mr = match.match_result
        next unless mr

        [match.home_team_id, match.away_team_id].compact.each do |team_id|
          accumulate_team_match(team_stats[team_id], match, mr, team_id)
        end
      end
    end

    def accumulate_team_match(stats, match, mr, team_id)
      is_home = (team_id == match.home_team_id)

      stats.wins += 1 if mr.winner_team_id == team_id

      if is_home
        stats.round_wins += mr.home_round_wins.to_i
        stats.round_losses += mr.away_round_wins.to_i
      else
        stats.round_wins += mr.away_round_wins.to_i
        stats.round_losses += mr.home_round_wins.to_i
      end

      # KAT-28 延長: penalty_side のチームに forfeit_count を +1 (= ranking で goal_diff -1 のペナルティ)
      if MatchResult::PENALTY_REQUIRED_DECISIONS.include?(mr.decision_type) && mr.penalty_side.present?
        penalized_id = (mr.penalty_side == "home") ? match.home_team_id : match.away_team_id
        stats.forfeit_count += 1 if penalized_id == team_id
      end

      match.rounds.each { |round| accumulate_team_round(stats, round, team_id) }
    end

    def accumulate_team_round(stats, round, team_id)
      round_side = if team_id == round.home_team_id
                     :home
                   elsif team_id == round.away_team_id
                     :away
                   else
                     return
                   end

      boards_won = 0
      boards_lost = 0

      round.board_results.each do |br|
        next if br.winner_side.blank?

        if round_side == :home
          boards_won += 1 if br.winner_side == "home"
          boards_lost += 1 if br.winner_side == "away"
          stats.game_wins += br.home_game_wins.to_i
          stats.game_losses += br.away_game_wins.to_i
        else
          boards_won += 1 if br.winner_side == "away"
          boards_lost += 1 if br.winner_side == "home"
          stats.game_wins += br.away_game_wins.to_i
          stats.game_losses += br.home_game_wins.to_i
        end
      end

      stats.board_wins += boards_won
      stats.board_losses += boards_lost
    end

    def build_teams_by_block(team_stats)
      teams = phase.league.teams
        .where(id: team_stats.keys)
        .includes(:block)
        .index_by(&:id)

      phase.blocks.includes(:teams).each do |block|
        block.teams.each do |team|
          team_stats[team.id] # ensure default entry
          teams[team.id] ||= team
        end
      end

      teams.values.group_by(&:block_id).reject { |block_id, _| block_id.nil? }
    end
  end
end
