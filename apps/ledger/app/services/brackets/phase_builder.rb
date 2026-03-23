module Brackets
  class PhaseBuilder
    class LockedError < StandardError; end

    def initialize(phase)
      @phase = phase
    end

    def rebuild!
      raise LockedError, I18n.t("flash.phases.bracket_structure_locked") if structure_locked?

      Match.transaction do
        clear_structure!
        return if phase.bracket_size_effective.blank?

        final_match = build_bracket!
        build_third_place_match!(third_place_sources(final_match)) if phase.third_place_match_enabled?
      end
    end

    private

    attr_reader :phase

    def build_bracket!
      return build_single_region_bracket! if phase.effective_bracket_region_count == 1

      region_finals = (1..phase.effective_bracket_region_count).map do |region_number|
        build_region!(region_number)
      end

      build_championship_bracket!(region_finals)
    end

    def build_single_region_bracket!
      previous_round_matches = []

      phase.region_round_count.times do |round_index|
        round = phase.bracket_rounds.create!(position: round_index + 1, round_kind: "championship")
        current_round_matches = create_round_matches!(
          round: round,
          round_position: round_index + 1,
          match_count: phase.bracket_size_effective / (2**(round_index + 1)),
          stage_key: "championship_round_#{round_index + 1}",
          slot_prefix: "R#{round_index + 1}"
        )

        wire_winner_sources!(current_round_matches, previous_round_matches) if previous_round_matches.any?
        previous_round_matches = current_round_matches
      end

      previous_round_matches.first
    end

    def build_region!(region_number)
      previous_round_matches = []

      phase.region_round_count.times do |round_index|
        round = phase.bracket_rounds.create!(position: round_index + 1, round_kind: "lane", lane_number: region_number)
        current_round_matches = create_round_matches!(
          round: round,
          round_position: round_index + 1,
          match_count: phase.per_region_bracket_size / (2**(round_index + 1)),
          stage_key: "region_#{region_number}_round_#{round_index + 1}",
          slot_prefix: "G#{region_number}-R#{round_index + 1}"
        )

        wire_winner_sources!(current_round_matches, previous_round_matches) if previous_round_matches.any?
        previous_round_matches = current_round_matches
      end

      previous_round_matches.first
    end

    def build_championship_bracket!(source_matches)
      previous_round_matches = source_matches.compact
      round_index = 0

      while previous_round_matches.size > 1
        round_index += 1
        round_position = phase.region_round_count + round_index
        round = phase.bracket_rounds.create!(position: round_position, round_kind: "championship")
        current_round_matches = create_round_matches!(
          round: round,
          round_position: round_position,
          match_count: previous_round_matches.size / 2,
          stage_key: "championship_round_#{round_index}",
          slot_prefix: "C#{round_index}"
        )

        wire_winner_sources!(current_round_matches, previous_round_matches)
        previous_round_matches = current_round_matches
      end

      previous_round_matches.first
    end

    def build_third_place_match!(source_matches)
      return if source_matches.size < 2

      round = phase.bracket_rounds.create!(position: phase.final_round_position, round_kind: "third_place")
      match = create_round_matches!(
        round: round,
        round_position: phase.final_round_position,
        match_count: 1,
        stage_key: "third_place",
        slot_prefix: "3RD"
      ).first

      match.update!(
        home_loser_source_match: source_matches[0],
        away_loser_source_match: source_matches[1]
      )
    end

    def third_place_sources(final_match)
      return [] if final_match.blank?

      [final_match.home_source_match, final_match.away_source_match].compact
    end

    def create_round_matches!(round:, round_position:, match_count:, stage_key:, slot_prefix:)
      Array.new(match_count) do |slot_index|
        phase.matches.create!(
          league: phase.league,
          phase: phase,
          bracket_round: round,
          slot_number: slot_index + 1,
          stage_key: stage_key,
          bracket_slot: "#{slot_prefix}-#{slot_index + 1}",
          status: "draft"
        )
      end
    end

    def wire_winner_sources!(current_round_matches, previous_round_matches)
      current_round_matches.each_with_index do |match, index|
        match.update!(
          home_source_match: previous_round_matches[index * 2],
          away_source_match: previous_round_matches[(index * 2) + 1]
        )
      end
    end

    def clear_structure!
      bracket_matches = phase.matches.where.not(bracket_round_id: nil).includes(:bracket_round).to_a
      match_ids = bracket_matches.map(&:id)

      Match.where(home_source_match_id: match_ids).update_all(home_source_match_id: nil)
      Match.where(away_source_match_id: match_ids).update_all(away_source_match_id: nil)
      Match.where(home_loser_source_match_id: match_ids).update_all(home_loser_source_match_id: nil)
      Match.where(away_loser_source_match_id: match_ids).update_all(away_loser_source_match_id: nil)

      bracket_matches.sort_by do |match|
        [match.bracket_round.third_place? ? 1 : 0, -match.bracket_round.position, -match.slot_number.to_i]
      end.reverse_each(&:destroy!)
      phase.bracket_rounds.destroy_all
    end

    def structure_locked?
      return true if legacy_structure_present?

      phase.matches.where.not(bracket_round_id: nil).any? do |match|
        match.home_team_id.present? ||
          match.away_team_id.present? ||
          match.match_result.present? ||
          match.rounds.exists? ||
          match.match_lineup_members.exists?
      end
    end

    def legacy_structure_present?
      phase.blocks.exists? || phase.weeks.exists? || phase.matches.where(bracket_round_id: nil).exists?
    end
  end
end
