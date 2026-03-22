module Brackets
  class PhaseLayout
    CARD_WIDTH = 216
    CARD_HEIGHT = 96
    COLUMN_GAP = 76
    PADDING_X = 28
    PADDING_Y = 56
    HEADER_HEIGHT = 44
    SLOT_UNIT = 120
    MIN_BODY_HEIGHT = 280

    def initialize(phase, routes:)
      @phase = phase
      @routes = routes
    end

    def build
      weeks = @phase.weeks.includes(matches: %i[home_team away_team match_result]).order(:position)
      columns = build_columns(weeks)
      connectors = build_connectors(columns)
      width = PADDING_X * 2 + (columns.size * CARD_WIDTH) + ([columns.size - 1, 0].max * COLUMN_GAP)
      height = HEADER_HEIGHT + PADDING_Y + body_height(columns) + PADDING_Y

      {
        participant_count: @phase.bracket_participant_count_effective,
        bracket_size: @phase.bracket_size_effective,
        bye_count: @phase.bracket_bye_count.to_i,
        width: [width, 640].max,
        height: [height, 360].max,
        columns:,
        connectors:,
      }
    end

    private

    def build_columns(weeks)
      total_body_height = body_height_for_weeks(weeks)
      total_columns = weeks.size

      weeks.each_with_index.map do |week, column_index|
        matches = sort_matches(week.matches.to_a)
        slot_count = [expected_slot_count_for(column_index, total_columns), 1].max
        slot_span = total_body_height.to_f / slot_count
        x = PADDING_X + column_index * (CARD_WIDTH + COLUMN_GAP)
        matches_by_slot = matches.index_by { |match| slot_number(match.bracket_slot) }

        cards = Array.new(slot_count) do |slot_index|
          y = HEADER_HEIGHT + PADDING_Y + (slot_span * slot_index) + ((slot_span - CARD_HEIGHT) / 2.0)
          slot_value = slot_index + 1
          match = matches_by_slot[slot_value] || matches[slot_index]
          build_card(match, week:, column_index:, slot_number: slot_value, x:, y:)
        end

        {
          week:,
          x:,
          label: week.display_name,
          match_count: matches.size,
          cards:,
        }
      end
    end

    def build_card(match, week:, column_index:, slot_number:, x:, y:)
      return build_empty_card(week:, column_index:, slot_number:, x:, y:) if match.blank?

      match_result = match.match_result

      {
        empty: false,
        match:,
        x:,
        y:,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        home_lines: wrap_lines(match.home_team.display_name),
        away_lines: wrap_lines(match.away_team.display_name),
        score: match_result ? "#{match_result.home_round_wins} - #{match_result.away_round_wins}" : nil,
        meta: [match.scheduled_on, match.scheduled_time&.strftime("%H:%M")].compact.join(" "),
        edit_path: @routes.edit_match_path(id: match),
        result_path: @routes.edit_match_result_entry_path(match_id: match),
      }
    end

    def build_empty_card(week:, column_index:, slot_number:, x:, y:)
      {
        empty: true,
        x:,
        y:,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        title: I18n.t("phases.empty_slot", number: slot_number),
        create_path: @routes.new_week_match_path(
          week_id: week,
          stage_key: stage_key_for(column_index),
          bracket_slot: slot_key_for(column_index, slot_number)
        ),
      }
    end

    def build_connectors(columns)
      columns.each_cons(2).flat_map do |left_column, right_column|
        next [] if left_column[:cards].empty? || right_column[:cards].empty?

        left_column[:cards].each_with_index.map do |card, index|
          next if card[:empty]

          target = right_column[:cards][[index / 2, right_column[:cards].size - 1].min]
          next if target.blank?

          mid_x = card[:x] + CARD_WIDTH + (COLUMN_GAP / 2.0)

          {
            x1: card[:x] + CARD_WIDTH,
            y1: card[:y] + (CARD_HEIGHT / 2.0),
            mx: mid_x,
            x2: target[:x],
            y2: target[:y] + (CARD_HEIGHT / 2.0),
          }
        end.compact
      end
    end

    def body_height(columns)
      counts = columns.map { |column| [column[:cards].size, 1].max }
      [counts.max.to_i * SLOT_UNIT, MIN_BODY_HEIGHT].max
    end

    def body_height_for_weeks(weeks)
      counts = weeks.each_with_index.map { |_week, index| expected_slot_count_for(index, weeks.size) }
      [counts.max.to_i * SLOT_UNIT, MIN_BODY_HEIGHT].max
    end

    def sort_matches(matches)
      matches.sort_by do |match|
        [
          slot_prefix_order(match.bracket_slot),
          slot_number(match.bracket_slot),
          match.scheduled_on || Date.new(2999, 12, 31),
          match.scheduled_time || Time.zone.parse("23:59"),
          match.created_at,
        ]
      end
    end

    def slot_prefix_order(value)
      prefix = value.to_s[/\A[a-z]+/i].to_s.downcase
      %w[qf sf f].index(prefix) || 99
    end

    def slot_number(value)
      value.to_s[/(\d+)\z/, 1].to_i
    end

    def expected_slot_count_for(column_index, total_columns)
      return 1 if total_columns <= 1

      2**(total_columns - column_index - 1)
    end

    def slot_key_for(column_index, slot_number)
      "R#{column_index + 1}-#{slot_number}"
    end

    def stage_key_for(column_index)
      "playoff_round_#{column_index + 1}"
    end

    def wrap_lines(text, max_chars: 18, max_lines: 2)
      value = text.to_s.strip
      return ["-"] if value.blank?

      characters = value.each_char.to_a
      lines = []

      until characters.empty? || lines.size == max_lines
        lines << characters.shift(max_chars).join
      end

      if characters.any?
        last = lines.pop.to_s
        lines << "#{last[0, [last.length - 1, 0].max]}…"
      end

      lines
    end
  end
end
