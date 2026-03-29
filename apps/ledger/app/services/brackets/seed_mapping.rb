require "set"

module Brackets
  class SeedMapping
    def initialize(phase)
      @phase = phase
    end

    # Returns { seed_number => { match:, side:, bye: } } sorted by seed number.
    def seed_slots
      @seed_slots ||= build_seed_slots.sort.to_h
    end

    def apply!(assignments)
      Match.transaction do
        clear_all_assignments!
        assign_teams!(normalize_assignments(assignments))
        sync_all_rounds!
      end
    end

    private

    attr_reader :phase

    def standard_seed_order(size)
      return [] if size.to_i < 2
      return [1, 2] if size == 2

      half = standard_seed_order(size / 2)
      half.flat_map { |seed| [seed, size + 1 - seed] }
    end

    def leaf_matches
      scope = phase.matches.where(home_source_match_id: nil, away_source_match_id: nil)

      if phase.effective_bracket_region_count == 1
        scope.where(stage_key: "championship_round_1").order(:slot_number)
      else
        scope.where("stage_key LIKE ?", "region_%_round_1")
          .joins(:bracket_round)
          .order("bracket_rounds.lane_number ASC, matches.slot_number ASC")
      end
    end

    def bye_seeds
      (1..phase.bracket_bye_count.to_i).to_a
    end

    def build_seed_slots
      slots = {}
      matches = leaf_matches.to_a
      bye_set = bye_seeds.to_set

      standard_seed_order(phase.bracket_size_effective.to_i).each_with_index do |seed_number, index|
        match = matches.fetch(index / 2)
        slots[seed_number] = {
          match: match,
          side: index.even? ? :home_team_id : :away_team_id,
          bye: bye_set.include?(seed_number),
        }
      end

      slots
    end

    def clear_all_assignments!
      leaf_matches.each do |match|
        match.reload
        match.update!(home_team_id: nil, away_team_id: nil)
        Brackets::ProgressionSync.new(match).sync!
      end
    end

    def assign_teams!(assignments)
      seed_slots.each do |seed_number, slot|
        team_id = assignments[seed_number]
        next if team_id.blank?

        match = slot[:match].reload
        match.update!(slot[:side] => team_id)
      end
    end

    def sync_all_rounds!
      phase.bracket_rounds.where.not(round_kind: "third_place").order(:position, :lane_number).each do |round|
        round.matches.each do |match|
          Brackets::ProgressionSync.new(match.reload).sync!
        end
      end
    end

    def normalize_assignments(assignments)
      assignments.each_with_object({}) do |(seed_number, team_id), normalized|
        seed = seed_number.is_a?(Integer) ? seed_number : Integer(seed_number, exception: false)
        next if seed.nil?

        normalized[seed] = team_id.presence
      end
    end
  end
end
