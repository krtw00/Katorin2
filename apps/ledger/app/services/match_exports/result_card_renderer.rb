require "cgi"
require "fileutils"
require "tempfile"
require "base64"

module MatchExports
  class ResultCardRenderer
    EXPORT_TYPE = "match_result_card".freeze
    RENDERER_KEY = "match_result_card_v1".freeze
    WIDTH = 1024
    HEIGHT = 1449
    OUTPUT_DIR = Rails.root.join("public", "generated", "match_exports")
    FONT_FAMILY = "'Noto Sans CJK JP', 'Noto Sans CJK', sans-serif".freeze

    def initialize(match)
      @match = match
    end

    def render!
      FileUtils.mkdir_p(OUTPUT_DIR)

      Tempfile.create(["match-result-card", ".svg"]) do |svg_file|
        svg_file.write(svg_document)
        svg_file.flush

        image = MiniMagick::Image.open(svg_file.path)
        image.format("png")
        image.write(output_path.to_s)
      end

      export = match.exports.find_or_initialize_by(export_type: EXPORT_TYPE)
      export.assign_attributes(
        league: match.league,
        renderer_key: RENDERER_KEY,
        status: "generated",
        generated_at: Time.current,
        file_path: public_file_path
      )
      export.save!
      export
    end

    private

    attr_reader :match

    def output_path
      OUTPUT_DIR.join("#{match.id}.png")
    end

    def public_file_path
      "/generated/match_exports/#{match.id}.png"
    end

    def svg_document
      <<~SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="#{WIDTH}" height="#{HEIGHT}" viewBox="0 0 #{WIDTH} #{HEIGHT}">
          <defs>
            <linearGradient id="canvasGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#d9e2f7"/>
              <stop offset="100%" stop-color="#edf2ff"/>
            </linearGradient>
            <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#cf3215"/>
              <stop offset="50%" stop-color="#111827"/>
              <stop offset="100%" stop-color="#22d3ee"/>
            </linearGradient>
            <style>
              .base { font-family: #{FONT_FAMILY}; fill: #f8fafc; }
              .meta { font-size: 26px; font-weight: 700; }
              .title { font-size: 58px; font-weight: 800; letter-spacing: 2px; }
              .header-label { font-size: 16px; font-weight: 700; fill: #dbeafe; }
              .team-name { font-size: 30px; font-weight: 800; fill: #ffffff; }
              .team-player { font-size: 24px; font-weight: 700; fill: #111827; }
              .round-title { font-size: 28px; font-weight: 800; fill: #f8fafc; }
              .table-head { font-size: 19px; font-weight: 800; fill: #f8fafc; }
              .table-cell { font-size: 22px; font-weight: 700; fill: #111827; }
              .table-cell-small { font-size: 18px; font-weight: 700; fill: #111827; }
              .score { font-size: 28px; font-weight: 800; fill: #111827; }
              .round-win { font-size: 28px; font-weight: 900; }
              .footer-team { font-size: 34px; font-weight: 800; fill: #ffffff; }
              .footer-score { font-size: 42px; font-weight: 900; fill: #ffffff; }
              .muted { fill: #94a3b8; }
            </style>
          </defs>
          #{canvas_background_svg}
          <rect x="0" y="0" width="#{WIDTH}" height="170" fill="url(#heroGradient)"/>
          <rect x="0" y="0" width="#{WIDTH}" height="170" fill="rgba(8, 15, 31, 0.32)"/>
          <text x="512" y="52" text-anchor="middle" class="base muted meta">MASTER DUEL</text>
          <text x="512" y="104" text-anchor="middle" class="base title">WMGP RESULT</text>
          <text x="512" y="146" text-anchor="middle" class="base muted meta">Katorin2 Match Ledger</text>
          #{header_meta_svg}
          #{versus_panel_svg}
          #{round_sections_svg}
          #{footer_svg}
        </svg>
      SVG
    end

    def header_meta_svg
      <<~SVG
        <rect x="0" y="170" width="#{WIDTH}" height="58" fill="#27447f"/>
        <text x="18" y="206" class="base header-label">JUDGE:</text>
        <text x="164" y="206" class="base meta">#{escape(match.judge_name.presence || "-")}</text>
        <text x="512" y="206" text-anchor="middle" class="base meta">#{escape(week_label)}</text>
        <text x="1006" y="206" text-anchor="end" class="base meta">#{escape(scheduled_label)}</text>
      SVG
    end

    def versus_panel_svg
      left_players = header_players("home")
      right_players = header_players("away")

      <<~SVG
        <rect x="20" y="246" width="372" height="160" fill="#0f172a"/>
        <rect x="632" y="246" width="372" height="160" fill="#0f172a"/>
        <rect x="392" y="246" width="240" height="160" fill="#18346a"/>

        #{fit_text_svg(42, 330, match.home_team.display_name, "team-name", "start", 195, font_size: 30)}
        #{fit_text_svg(982, 330, match.away_team.display_name, "team-name", "end", 195, font_size: 30)}

        #{player_strip_svg(242, left_players)}
        #{player_strip_svg(632, right_players)}

        <text x="512" y="336" text-anchor="middle" class="base title">#{escape(I18n.t("labels.vs"))}</text>
      SVG
    end

    def round_sections_svg
      rounds = match.rounds.index_by(&:number)
      (1..3).map.with_index do |round_number, index|
        round = rounds[round_number]
        top = 430 + (index * 280)
        round_section_svg(round_number, round, top)
      end.join
    end

    def round_section_svg(round_number, round, top)
      boards = round&.board_results&.index_by(&:board_number) || {}
      <<~SVG
        <rect x="20" y="#{top}" width="984" height="40" fill="#0f172a"/>
        <text x="512" y="#{top + 28}" text-anchor="middle" class="base round-title">ROUND#{round_number}</text>
        #{round_table_header_svg(top + 40)}
        #{(1..3).map { |board_number| round_board_row_svg(boards[board_number], top + 40 + ((board_number - 1) * 50), board_number) }.join}
        #{round_winner_svg(round, top + 196)}
      SVG
    end

    def round_table_header_svg(top)
      <<~SVG
        <rect x="20" y="#{top}" width="984" height="36" fill="#111827"/>
        <text x="100" y="#{top + 24}" text-anchor="middle" class="base table-head">PLAYER</text>
        <text x="312" y="#{top + 24}" text-anchor="middle" class="base table-head">DECK</text>
        <text x="512" y="#{top + 24}" text-anchor="middle" class="base table-head">SCORE</text>
        <text x="712" y="#{top + 24}" text-anchor="middle" class="base table-head">DECK</text>
        <text x="924" y="#{top + 24}" text-anchor="middle" class="base table-head">PLAYER</text>
      SVG
    end

    def round_board_row_svg(board, top, board_number)
      board ||= BoardResult.new(board_number: board_number)
      row_top = top + 36
      <<~SVG
        <rect x="20" y="#{row_top}" width="984" height="50" fill="#ffe082"/>
        #{grid_lines_svg(row_top, 50)}
        #{fit_text_svg(100, row_top + 31, board.home_participant&.display_name || "-", "table-cell", "middle", 150, font_size: 22)}
        #{fit_text_svg(312, row_top + 31, board.home_deck_name.presence || "-", "table-cell", "middle", 250, font_size: 22)}
        <text x="512" y="#{row_top + 31}" text-anchor="middle" class="base score">#{escape(board.score_text || "- -")}</text>
        #{fit_text_svg(712, row_top + 31, board.away_deck_name.presence || "-", "table-cell", "middle", 250, font_size: 22)}
        #{fit_text_svg(924, row_top + 31, board.away_participant&.display_name || "-", "table-cell", "middle", 150, font_size: 22)}
      SVG
    end

    def round_winner_svg(round, top)
      home_label, away_label =
        case round&.winner_team_id
        when match.home_team_id then ["W", "L"]
        when match.away_team_id then ["L", "W"]
        else ["-", "-"]
        end

      <<~SVG
        <text x="472" y="#{top + 28}" text-anchor="end" class="round-win" fill="#ef4444">#{home_label}</text>
        <text x="552" y="#{top + 28}" text-anchor="start" class="round-win" fill="#2563eb">#{away_label}</text>
      SVG
    end

    def footer_svg
      result = match.match_result
      home_score = result&.home_round_wins.to_i
      away_score = result&.away_round_wins.to_i

      <<~SVG
        <rect x="20" y="1294" width="984" height="70" fill="#0f172a"/>
        #{fit_text_svg(160, 1339, match.home_team.display_name, "footer-team", "middle", 280, font_size: 34)}
        <text x="512" y="1339" text-anchor="middle" class="base footer-score">#{home_score} - #{away_score}</text>
        #{fit_text_svg(864, 1339, match.away_team.display_name, "footer-team", "middle", 280, font_size: 34)}
      SVG
    end

    def grid_lines_svg(top, height)
      <<~SVG
        <line x1="180" y1="#{top}" x2="180" y2="#{top + height}" stroke="#111827" stroke-width="1"/>
        <line x1="444" y1="#{top}" x2="444" y2="#{top + height}" stroke="#111827" stroke-width="1"/>
        <line x1="580" y1="#{top}" x2="580" y2="#{top + height}" stroke="#111827" stroke-width="1"/>
        <line x1="844" y1="#{top}" x2="844" y2="#{top + height}" stroke="#111827" stroke-width="1"/>
      SVG
    end

    def player_strip_svg(x, names)
      names.each_with_index.map do |name, index|
        y = 264 + (index * 42)
        box_w = 150
        <<~SVG
          <rect x="#{x}" y="#{y}" width="#{box_w}" height="38" fill="#ffe082" stroke="#111827" stroke-width="1"/>
          #{fit_text_svg(x + (box_w / 2), y + 25, name, "table-cell-small", "middle", 142, font_size: 18)}
        SVG
      end.join
    end

    def header_players(side)
      round_one = match.rounds.find { |round| round.number == 1 }
      round_players =
        round_one&.board_results&.map do |board|
          participant = side == "home" ? board.home_participant : board.away_participant
          participant&.display_name
        end

      names = round_players.presence || (side == "home" ? match.home_team.participants.limit(3).pluck(:display_name) : match.away_team.participants.limit(3).pluck(:display_name))
      names.compact.first(3).presence || ["-", "-", "-"]
    end

    def week_label
      match.bracket_match? ? match.bracket_slot_label : match.week.display_name
    end

    def scheduled_label
      parts = []
      parts << match.scheduled_on&.strftime("%Y/%-m/%-d")
      parts << match.scheduled_time&.strftime("%H:%M")
      parts.compact.join(" ")
    end

    def multiline_text_svg(x, y, text, klass, max_chars, anchor, max_lines: 2, line_height: 30)
      lines = wrap_text(text.to_s, max_chars).first(max_lines)
      lines = [text.to_s] if lines.empty?
      offset =
        case lines.length
        when 1 then 0
        when 2 then -(line_height / 2)
        else -line_height
        end

      tspans = lines.each_with_index.map do |line, index|
        dy = index.zero? ? offset : line_height
        %(<tspan x="#{x}" dy="#{dy}">#{escape(line)}</tspan>)
      end.join

      %(<text x="#{x}" y="#{y}" text-anchor="#{anchor}" class="base #{klass}">#{tspans}</text>)
    end

    def fit_text_svg(x, y, text, klass, anchor, max_width, font_size:)
      content = text.to_s.strip.presence || "-"
      escaped = escape(content)
      estimated_width = content.each_char.sum { |char| char.bytesize > 1 ? font_size * 0.9 : font_size * 0.6 }
      attrs = %{x="#{x}" y="#{y}" text-anchor="#{anchor}" class="base #{klass}"}

      if estimated_width > max_width
        %(<text #{attrs} textLength="#{max_width}" lengthAdjust="spacingAndGlyphs">#{escaped}</text>)
      else
        %(<text #{attrs}>#{escaped}</text>)
      end
    end

    def canvas_background_svg
      if match.league.header_image.attached?
        <<~SVG
          <image x="0" y="0" width="#{WIDTH}" height="#{HEIGHT}" preserveAspectRatio="xMidYMid slice" href="#{header_image_data_uri}" />
          <rect x="0" y="0" width="#{WIDTH}" height="#{HEIGHT}" fill="rgba(238, 242, 255, 0.84)"/>
        SVG
      else
        <<~SVG
          <rect width="#{WIDTH}" height="#{HEIGHT}" fill="url(#canvasGradient)"/>
        SVG
      end
    end

    def header_image_data_uri
      blob = match.league.header_image.blob
      encoded = Base64.strict_encode64(match.league.header_image.download)
      "data:#{blob.content_type};base64,#{encoded}"
    end

    def wrap_text(text, max_chars)
      normalized = text.to_s.gsub(/\s+/, " ").strip
      return [] if normalized.blank?

      words = normalized.split(" ")
      return normalized.scan(/.{1,#{max_chars}}/) if words.one?

      lines = [String.new]
      words.each do |word|
        candidate = lines.last.blank? ? word : "#{lines.last} #{word}"
        if candidate.length <= max_chars
          lines[-1] = candidate
        else
          lines << word
        end
      end
      lines
    end

    def truncate(text, max_chars)
      value = text.to_s.strip
      return value if value.length <= max_chars

      "#{value.first(max_chars - 1)}…"
    end

    def escape(text)
      CGI.escapeHTML(text.to_s)
    end
  end
end
