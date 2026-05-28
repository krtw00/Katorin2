module MatchResults
  class Recorder
    ROUND_COUNT = 3
    BOARD_COUNT = 3

    def initialize(match, payload)
      @match = match
      @payload = payload.deep_stringify_keys
    end

    def save!
      Match.transaction do
        round_summaries = process_rounds!
        persist_match_result!(round_summaries)
      end
    end

    private

    attr_reader :match, :payload

    def process_rounds!
      (1..ROUND_COUNT).map do |round_number|
        round_payload = payload.dig("rounds", round_number.to_s) || {}
        round = match.rounds.find { |existing_round| existing_round.number == round_number } || Round.new(match: match, number: round_number)
        round.home_team = match.home_team
        round.away_team = match.away_team

        board_records = process_boards!(round, round_payload.fetch("boards", {}))

        if board_records.empty?
          round.destroy! if round.persisted?
          next { confirmed: false, winner_team_id: nil }
        end

        home_wins = board_records.count { |board| board.winner_side == "home" }
        away_wins = board_records.count { |board| board.winner_side == "away" }
        round_confirmed = board_records.size == BOARD_COUNT && board_records.all? { |board| board.result_status == "confirmed" }

        round.result_status = round_confirmed ? "confirmed" : "partial"
        round.winner_team =
          if round_confirmed && home_wins > away_wins
            match.home_team
          elsif round_confirmed && away_wins > home_wins
            match.away_team
          end

        round.save!

        { confirmed: round_confirmed, winner_team_id: round.winner_team_id }
      end
    end

    def process_boards!(round, boards_payload)
      saved_boards = []

      (1..BOARD_COUNT).each do |board_number|
        board_payload = boards_payload[board_number.to_s] || {}
        board = round.board_results.find { |existing_board| existing_board.board_number == board_number } || BoardResult.new(board_number: board_number)

        home_participant_id = board_payload["home_participant_id"].presence
        away_participant_id = board_payload["away_participant_id"].presence
        home_deck_name = board_payload["home_deck_name"].presence
        away_deck_name = board_payload["away_deck_name"].presence
        home_game_wins = integer_or_nil(board_payload["home_game_wins"])
        away_game_wins = integer_or_nil(board_payload["away_game_wins"])
        winner_side = BoardResult.infer_winner_side(home_game_wins, away_game_wins)
        notes = board_payload["notes"].presence

        if [home_participant_id, away_participant_id, home_deck_name, away_deck_name, home_game_wins, away_game_wins, notes].all?(&:blank?)
          board.destroy! if board.persisted?
          next
        end

        board.assign_attributes(
          round: round,
          home_participant_id: home_participant_id,
          away_participant_id: away_participant_id,
          home_deck_name: home_deck_name,
          away_deck_name: away_deck_name,
          home_game_wins: home_game_wins,
          away_game_wins: away_game_wins,
          winner_side: winner_side,
          notes: notes,
          result_status: board_complete?(home_participant_id, away_participant_id, home_deck_name, away_deck_name, home_game_wins, away_game_wins) ? "confirmed" : "partial"
        )
        board.save!
        saved_boards << board
      end

      saved_boards
    end

    def persist_match_result!(round_summaries)
      confirmed_rounds = round_summaries.select { |summary| summary[:confirmed] && summary[:winner_team_id].present? }
      confirmed_round_count = round_summaries.count { |summary| summary[:confirmed] }
      home_round_wins = confirmed_rounds.count { |summary| summary[:winner_team_id] == match.home_team_id }
      away_round_wins = confirmed_rounds.count { |summary| summary[:winner_team_id] == match.away_team_id }
      any_input = round_summaries.any? { |summary| summary[:confirmed] || summary[:winner_team_id].present? } || match.rounds.exists?

      if !any_input && match.match_result&.persisted?
        match.match_result.destroy!
        reset_match_state!
        return
      end

      result = match.match_result || match.build_match_result
      result.decision_type = decision_type
      result.penalty_side = penalty_side_for_result

      # KAT-28 延長: forfeit_match / disqualification は WMGP module の expander で
      # round_wins を自動セット (= victim 2-0 / forfeiter 0-2)。 status は強制 confirmed
      if forfeit_decision? && result.penalty_side.present?
        expanded = forfeit_score_expander.expand(
          decision_type: result.decision_type,
          penalty_side: result.penalty_side
        )
        home_round_wins = expanded[:home_round_wins]
        away_round_wins = expanded[:away_round_wins]
      end

      result.home_round_wins = home_round_wins
      result.away_round_wins = away_round_wins
      result.winner_team =
        if home_round_wins > away_round_wins
          match.home_team
        elsif away_round_wins > home_round_wins
          match.away_team
        end

      result_status =
        if forfeit_decision? && result.penalty_side.present?
          "confirmed"
        else
          match_confirmed?(home_round_wins, away_round_wins, confirmed_round_count) ? "confirmed" : "partial"
        end
      result.result_status = result_status
      result.confirmed_at = result.result_status == "confirmed" ? Time.current : nil
      result.save!

      match.status = result.result_status == "confirmed" ? "confirmed" : "result_pending"
      match.save!
    end

    def forfeit_decision?
      MatchResult::PENALTY_REQUIRED_DECISIONS.include?(decision_type)
    end

    def penalty_side_for_result
      return nil unless forfeit_decision?

      value = payload["penalty_side"].presence
      %w[home away].include?(value) ? value : nil
    end

    def forfeit_score_expander
      ::RuleModules::Registry.default.rules.forfeit_score_expander
    end

    def reset_match_state!
      match.status = "scheduled" if match.status.in?(%w[result_pending confirmed])
      match.save!
    end

    def board_complete?(home_participant_id, away_participant_id, home_deck_name, away_deck_name, home_game_wins, away_game_wins)
      side_inputs_complete?(match.home_team, home_participant_id, home_deck_name) &&
        side_inputs_complete?(match.away_team, away_participant_id, away_deck_name) &&
        BoardResult.valid_confirmed_score?(home_game_wins, away_game_wins)
    end

    def side_inputs_complete?(team, participant_id, deck_name)
      return true if team&.status == "withdrawn"
      return true if decision_lenient?

      participant_id.present? && deck_name.present?
    end

    def decision_type
      value = payload["decision_type"].presence
      MatchResult.decision_types.key?(value) ? value : "normal"
    end

    # 失格・没収・no-game では運営が選手名・デッキ未入力でも結果を確定できる
    def decision_lenient?
      decision_type.in?(%w[forfeit_match disqualification no_game])
    end

    def integer_or_nil(value)
      return nil if value.blank?

      Integer(value, 10)
    rescue ArgumentError, TypeError
      nil
    end

    def match_confirmed?(home_round_wins, away_round_wins, confirmed_round_count)
      return true if home_round_wins >= 2 || away_round_wins >= 2
      return false if match.bracket_match?

      confirmed_round_count == ROUND_COUNT
    end
  end
end
