module Brackets
  class PhaseLayout
    CARD_WIDTH = 272
    CARD_HEIGHT = 128
    COLUMN_GAP = 104
    SIDE_GAP = 120
    PADDING_X = 40
    PADDING_Y = 68
    HEADER_HEIGHT = 52
    SLOT_UNIT = 142
    MIN_BODY_HEIGHT = 340
    THIRD_PLACE_OFFSET_Y = 176
    REGION_STACK_GAP = 132

    def initialize(phase, routes:)
      @phase = phase
      @routes = routes
    end

    def build
      case phase.effective_bracket_region_count
      when 4
        build_four_region
      when 2
        build_two_region
      else
        build_single_region
      end
    end

    private

    attr_reader :phase

    def build_single_region
      rounds = championship_rounds
      third_place_round = phase.bracket_rounds.find_by(round_kind: "third_place")
      cards = []
      labels = []
      card_map = {}
      total_body_height = body_height_for_counts(rounds.map { |round| [round.matches.size, 1].max })

      rounds.each_with_index do |round, column_index|
        x = PADDING_X + column_index * (CARD_WIDTH + COLUMN_GAP)
        labels << label_entry(round, x)
        slot_count = [expected_slot_count_for(column_index, rounds.size), 1].max
        round_cards = build_round_cards(round.matches.order(:slot_number).to_a, x:, slot_count:, total_body_height:)
        round_cards.each { |card| card_map[card[:match].id] = card }
        cards.concat(round_cards)
      end

      if third_place_round.present?
        final_card = cards.find { |card| card[:match].bracket_round == rounds.last }
        third_card = build_card(third_place_round.matches.first, x: final_card[:x], y: final_card[:y] + THIRD_PLACE_OFFSET_Y)
        labels << label_entry(third_place_round, third_card[:x], y: third_card[:y] - 10)
        cards << third_card
        card_map[third_card[:match].id] = third_card
      end

      {
        participant_count: phase.bracket_participant_count_effective,
        bracket_size: phase.bracket_size_effective,
        bye_count: phase.bracket_bye_count.to_i,
        width: [PADDING_X * 2 + block_width(rounds.size), 760].max,
        height: [HEADER_HEIGHT + PADDING_Y + total_body_height + PADDING_Y + (third_place_round.present? ? THIRD_PLACE_OFFSET_Y : 0), 420].max,
        labels: labels,
        cards: cards,
        connectors: connectors_for(card_map),
      }
    end

    def build_two_region
      left_rounds = region_rounds(1)
      right_rounds = region_rounds(2)
      final_round = championship_rounds.last
      third_place_round = phase.bracket_rounds.find_by(round_kind: "third_place")
      cards = []
      labels = []
      card_map = {}
      region_body_height = body_height_for_counts(left_rounds.map { |round| [round.matches.size, 1].max })
      region_width = block_width(left_rounds.size)
      final_x = PADDING_X + region_width + SIDE_GAP
      right_start_x = final_x + CARD_WIDTH + SIDE_GAP
      width = right_start_x + region_width + PADDING_X

      left_rounds.each_with_index do |round, index|
        x = PADDING_X + index * (CARD_WIDTH + COLUMN_GAP)
        labels << label_entry(round, x)
        round_cards = build_round_cards(round.matches.order(:slot_number).to_a, x:, slot_count: round.matches.size, total_body_height: region_body_height)
        round_cards.each { |card| card_map[card[:match].id] = card }
        cards.concat(round_cards)
      end

      right_rounds.each_with_index do |round, index|
        x = right_start_x + (right_rounds.size - index - 1) * (CARD_WIDTH + COLUMN_GAP)
        labels << label_entry(round, x)
        round_cards = build_round_cards(round.matches.order(:slot_number).to_a, x:, slot_count: round.matches.size, total_body_height: region_body_height)
        round_cards.each { |card| card_map[card[:match].id] = card }
        cards.concat(round_cards)
      end

      if final_round.present?
        final_card = build_card(final_round.matches.first, x: final_x, y: center_y_for(region_body_height))
        labels << label_entry(final_round, final_x, y: final_card[:y] - 10)
        cards << final_card
        card_map[final_card[:match].id] = final_card
      end

      if third_place_round.present?
        third_card = build_card(third_place_round.matches.first, x: final_x, y: center_y_for(region_body_height) + THIRD_PLACE_OFFSET_Y)
        labels << label_entry(third_place_round, final_x, y: third_card[:y] - 10)
        cards << third_card
        card_map[third_card[:match].id] = third_card
      end

      {
        participant_count: phase.bracket_participant_count_effective,
        bracket_size: phase.bracket_size_effective,
        bye_count: phase.bracket_bye_count.to_i,
        width: width,
        height: [HEADER_HEIGHT + PADDING_Y + region_body_height + PADDING_Y + (third_place_round.present? ? THIRD_PLACE_OFFSET_Y : 0), 520].max,
        labels: labels,
        cards: cards,
        connectors: connectors_for(card_map),
      }
    end

    def build_four_region
      regions = (1..4).to_h { |region_number| [region_number, region_rounds(region_number)] }
      semifinal_round = championship_rounds.first
      final_round = championship_rounds.last
      third_place_round = phase.bracket_rounds.find_by(round_kind: "third_place")
      cards = []
      labels = []
      card_map = {}

      region_body_height = body_height_for_counts(regions.values.first.map { |round| [round.matches.size, 1].max })
      top_offset = 0
      bottom_offset = region_body_height + REGION_STACK_GAP
      total_region_body_height = region_body_height * 2 + REGION_STACK_GAP
      region_width = block_width(regions.values.first.size)
      left_semi_x = PADDING_X + region_width + SIDE_GAP
      final_x = left_semi_x + CARD_WIDTH + SIDE_GAP
      right_semi_x = final_x + CARD_WIDTH + SIDE_GAP
      right_start_x = right_semi_x + CARD_WIDTH + SIDE_GAP
      width = right_start_x + region_width + PADDING_X

      {
        1 => { offset_y: top_offset, side: :left },
        2 => { offset_y: bottom_offset, side: :left },
        3 => { offset_y: top_offset, side: :right },
        4 => { offset_y: bottom_offset, side: :right },
      }.each do |region_number, config|
        rounds = regions.fetch(region_number)
        rounds.each_with_index do |round, index|
          x = if config[:side] == :left
                PADDING_X + index * (CARD_WIDTH + COLUMN_GAP)
              else
                right_start_x + (rounds.size - index - 1) * (CARD_WIDTH + COLUMN_GAP)
              end
          labels << label_entry(round, x, y: 34 + config[:offset_y])
          round_cards = build_round_cards(
            round.matches.order(:slot_number).to_a,
            x: x,
            slot_count: round.matches.size,
            total_body_height: region_body_height,
            offset_y: config[:offset_y]
          )
          round_cards.each { |card| card_map[card[:match].id] = card }
          cards.concat(round_cards)
        end
      end

      semifinal_cards = []
      if semifinal_round.present?
        semifinal_matches = semifinal_round.matches.order(:slot_number).to_a
        left_sources = semifinal_matches.first&.yield_self { |match| [card_map[match.home_source_match_id], card_map[match.away_source_match_id]].compact }
        right_sources = semifinal_matches.second&.yield_self { |match| [card_map[match.home_source_match_id], card_map[match.away_source_match_id]].compact }

        if semifinal_matches.first.present?
          left_y = grouped_target_y(left_sources)
          left_card = build_card(semifinal_matches.first, x: left_semi_x, y: left_y)
          labels << label_entry(semifinal_round, left_semi_x, y: left_card[:y] - 10)
          cards << left_card
          card_map[left_card[:match].id] = left_card
          semifinal_cards << left_card
        end

        if semifinal_matches.second.present?
          right_y = grouped_target_y(right_sources)
          right_card = build_card(semifinal_matches.second, x: right_semi_x, y: right_y)
          labels << label_entry(semifinal_round, right_semi_x, y: right_card[:y] - 10)
          cards << right_card
          card_map[right_card[:match].id] = right_card
          semifinal_cards << right_card
        end
      end

      if final_round.present?
        final_y = grouped_target_y(semifinal_cards)
        final_card = build_card(final_round.matches.first, x: final_x, y: final_y)
        labels << label_entry(final_round, final_x, y: final_card[:y] - 10)
        cards << final_card
        card_map[final_card[:match].id] = final_card
      end

      if third_place_round.present?
        third_y = grouped_target_y(semifinal_cards) + THIRD_PLACE_OFFSET_Y
        third_card = build_card(third_place_round.matches.first, x: final_x, y: third_y)
        labels << label_entry(third_place_round, final_x, y: third_card[:y] - 10)
        cards << third_card
        card_map[third_card[:match].id] = third_card
      end

      {
        participant_count: phase.bracket_participant_count_effective,
        bracket_size: phase.bracket_size_effective,
        bye_count: phase.bracket_bye_count.to_i,
        width: width,
        height: [HEADER_HEIGHT + PADDING_Y + total_region_body_height + PADDING_Y + (third_place_round.present? ? THIRD_PLACE_OFFSET_Y : 0), 860].max,
        labels: labels,
        cards: cards,
        connectors: connectors_for(card_map),
      }
    end

    def region_rounds(region_number)
      phase.bracket_rounds.where(round_kind: "lane", lane_number: region_number).includes(matches: match_includes).order(:position)
    end

    def championship_rounds
      phase.bracket_rounds.where(round_kind: "championship").includes(matches: match_includes).order(:position)
    end

    def match_includes
      %i[home_team away_team match_result home_source_match away_source_match home_loser_source_match away_loser_source_match]
    end

    def build_round_cards(matches, x:, slot_count:, total_body_height:, offset_y: 0)
      matches.map do |match|
        y = slot_y(match.slot_number, slot_count, total_body_height, offset_y: offset_y)
        build_card(match, x:, y:)
      end
    end

    def build_card(match, x:, y:)
      match_result = match.match_result
      {
        match: match,
        x: x,
        y: y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        slot_meta_y: y + 18,
        home_text_y: y + 44,
        vs_text_y: y + 72,
        away_text_y: y + 98,
        score_y: y + 38,
        info_meta_y: y + 58,
        pill_y: y + CARD_HEIGHT - 28,
        pill_text_y: y + CARD_HEIGHT - 15,
        home_lines: wrap_lines(team_text(match, side: :home), max_chars: 22, max_lines: 1),
        away_lines: wrap_lines(team_text(match, side: :away), max_chars: 22, max_lines: 1),
        score: match_result ? "#{match_result.home_round_wins} - #{match_result.away_round_wins}" : nil,
        meta: [match.scheduled_on, match.scheduled_time&.strftime("%H:%M")].compact.join(" "),
        show_path: @routes.match_path(id: match),
        edit_path: @routes.edit_match_path(id: match),
        result_path: @routes.edit_match_result_entry_path(match_id: match),
        ready: match.ready_for_result_entry?,
        slot_label: match.bracket_slot_label,
      }
    end

    def team_text(match, side:)
      team = side == :home ? match.home_team : match.away_team
      source_match = side == :home ? match.home_source_match : match.away_source_match
      loser_source = side == :home ? match.home_loser_source_match : match.away_loser_source_match
      return team.display_name if team.present?
      return I18n.t("phases.waiting_loser", match: loser_source.bracket_slot_label) if loser_source.present?
      return I18n.t("phases.seed_placeholder", slot: slot_label(match.slot_number, side)) if source_match.blank?

      I18n.t("phases.waiting_winner", match: source_match.bracket_slot_label)
    end

    def connectors_for(card_map)
      card_map.values.flat_map do |card|
        match = card[:match]
        [
          match.home_source_match_id,
          match.away_source_match_id,
          match.home_loser_source_match_id,
          match.away_loser_source_match_id,
        ].compact.filter_map do |source_match_id|
          connector(card_map[source_match_id], card)
        end
      end
    end

    def connector(source, target)
      return if source.blank? || target.blank?

      y1 = source[:y] + (CARD_HEIGHT / 2.0)
      y2 = target[:y] + (CARD_HEIGHT / 2.0)

      if source[:x] < target[:x]
        x1 = source[:x] + CARD_WIDTH
        x2 = target[:x]
      else
        x1 = source[:x]
        x2 = target[:x] + CARD_WIDTH
      end

      mid_x = (x1 + x2) / 2.0
      { d: "M #{x1} #{y1} L #{mid_x} #{y1} L #{mid_x} #{y2} L #{x2} #{y2}" }
    end

    def label_entry(round, x, y: 34)
      {
        x: x + 8,
        y: y,
        text: column_label(round),
      }
    end

    def column_label(round)
      return round.display_name unless round.region?

      "#{round.display_name} / #{I18n.t('phases.round_region', count: round.lane_number)}"
    end

    def slot_y(slot_number, slot_count, total_body_height, offset_y: 0)
      slot_span = total_body_height.to_f / [slot_count, 1].max
      HEADER_HEIGHT + PADDING_Y + offset_y + (slot_span * (slot_number - 1)) + ((slot_span - CARD_HEIGHT) / 2.0)
    end

    def center_y_for(total_body_height)
      HEADER_HEIGHT + PADDING_Y + ((total_body_height - CARD_HEIGHT) / 2.0)
    end

    def grouped_target_y(cards)
      centers = Array(cards).filter_map { |card| card && (card[:y] + (CARD_HEIGHT / 2.0)) }
      return HEADER_HEIGHT + PADDING_Y if centers.empty?

      (centers.sum / centers.size.to_f) - (CARD_HEIGHT / 2.0)
    end

    def body_height_for_counts(counts)
      [counts.max.to_i * SLOT_UNIT, MIN_BODY_HEIGHT].max
    end

    def expected_slot_count_for(column_index, total_columns)
      return 1 if total_columns <= 1

      2**(total_columns - column_index - 1)
    end

    def block_width(column_count)
      column_count * CARD_WIDTH + ([column_count - 1, 0].max * COLUMN_GAP)
    end

    def slot_label(slot, side)
      "#{slot}#{side == :home ? 'A' : 'B'}"
    end

    def wrap_lines(text, max_chars: 18, max_lines: 2)
      value = text.to_s.strip
      return [I18n.t("labels.none")] if value.blank?

      characters = value.scan(/\X/)
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
