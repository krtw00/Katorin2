require "cgi"
require "fileutils"
require "tempfile"
require "base64"

module StandingsExports
  class TableRenderer
    WIDTH = 1024
    HERO_HEIGHT = 170
    GROUP_TITLE_HEIGHT = 35
    TABLE_HEADER_HEIGHT = 36
    ROW_HEIGHT = 40
    GROUP_GAP = 8
    TABLE_LEFT = 20
    TABLE_WIDTH = 984
    OUTPUT_DIR = Rails.root.join("public", "generated", "standings_exports")
    FONT_FAMILY = "'Noto Sans CJK JP', 'Noto Sans CJK', 'Noto Color Emoji', sans-serif".freeze
    NUM_FONT = "'Noto Sans', 'Noto Sans CJK JP', sans-serif".freeze

    COLUMNS = [
      { key: :rank,             label: "",              x: 38,  anchor: "middle" },
      { key: :team,             label: "チーム名",       x: 176, anchor: "middle", text_x: 64, text_anchor: "start", max_w: 224 },
      { key: :wins,             label: "勝利数",         x: 328, anchor: "middle" },
      { key: :points,           label: "勝点",           x: 392, anchor: "middle" },
      { key: :round_wins,       label: "得点",           x: 454, anchor: "middle" },
      { key: :round_losses,     label: "失点",           x: 514, anchor: "middle" },
      { key: :goal_diff,        label: "得失点",         x: 580, anchor: "middle" },
      { key: :round_board_diff, label: "ラウンド得失点",  x: 668, anchor: "middle" },
      { key: :match_game_diff,  label: "マッチ得失点",    x: 772, anchor: "middle" },
      { key: :board_wins_total, label: "ラウンド総得点",  x: 914, anchor: "middle" },
    ].freeze

    COL_BORDERS = [56, 296, 360, 424, 484, 544, 616, 720, 824].freeze

    def initialize(phase, standings_by_block, blocks)
      @phase = phase
      @standings_by_block = standings_by_block
      @blocks = blocks
    end

    def render!
      FileUtils.mkdir_p(OUTPUT_DIR)

      Tempfile.create(["standings-table", ".svg"]) do |svg_file|
        svg_file.write(svg_document)
        svg_file.flush

        image = MiniMagick::Image.open(svg_file.path)
        image.format("png")
        image.write(output_path.to_s)
      end

      output_path
    end

    private

    def output_path
      OUTPUT_DIR.join("#{@phase.id}.png")
    end

    def total_height
      body_height = @blocks.sum do |_block_id, block|
        rows = @standings_by_block[block.id] || []
        GROUP_TITLE_HEIGHT + TABLE_HEADER_HEIGHT + (rows.size * ROW_HEIGHT) + GROUP_GAP
      end
      HERO_HEIGHT + body_height + 20
    end

    def svg_document
      height = total_height
      <<~SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="#{WIDTH}" height="#{height}" viewBox="0 0 #{WIDTH} #{height}">
          <defs>
            <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#cf3215"/>
              <stop offset="50%" stop-color="#111827"/>
              <stop offset="100%" stop-color="#22d3ee"/>
            </linearGradient>
            <style>
              .base { font-family: #{FONT_FAMILY}; }
              .hero-sub { font-size: 26px; font-weight: 700; fill: #94a3b8; }
              .hero-title { font-size: 58px; font-weight: 800; fill: #f8fafc; letter-spacing: 2px; }
              .group-title { font-size: 22px; font-weight: 800; fill: #f8fafc; }
              .th { font-size: 16px; font-weight: 800; fill: #111827; }
              .td { font-family: #{NUM_FONT}; font-size: 18px; font-weight: 600; fill: #111827; }
              .td-rank { font-family: #{NUM_FONT}; font-size: 20px; font-weight: 800; font-style: italic; fill: #111827; }
              .td-team { font-size: 18px; font-weight: 700; fill: #111827; }
              .td-pts { font-family: #{NUM_FONT}; font-size: 18px; font-weight: 800; fill: #111827; }
            </style>
          </defs>

          <!-- background -->
          <rect width="#{WIDTH}" height="#{height}" fill="#e8e8e8"/>

          <!-- hero header -->
          <rect x="0" y="0" width="#{WIDTH}" height="#{HERO_HEIGHT}" fill="url(#heroGradient)"/>
          <rect x="0" y="0" width="#{WIDTH}" height="#{HERO_HEIGHT}" fill="rgba(8, 15, 31, 0.32)"/>
          <text x="512" y="52" text-anchor="middle" class="base hero-sub">MASTER DUEL</text>
          <text x="512" y="104" text-anchor="middle" class="base hero-title">WMGP STANDINGS</text>
          <text x="512" y="146" text-anchor="middle" class="base hero-sub">Katorin2 Match Ledger</text>

          #{body_svg}
        </svg>
      SVG
    end

    def body_svg
      y = HERO_HEIGHT
      parts = []

      @blocks.each do |_block_id, block|
        rows = @standings_by_block[block.id] || []

        # group title bar
        parts << %(<rect x="#{TABLE_LEFT}" y="#{y}" width="#{TABLE_WIDTH}" height="#{GROUP_TITLE_HEIGHT}" fill="#0f172a"/>)
        parts << %(<text x="512" y="#{y + 24}" text-anchor="middle" class="base group-title">#{escape(block.name)}</text>)
        y += GROUP_TITLE_HEIGHT

        # table header
        parts << %(<rect x="#{TABLE_LEFT}" y="#{y}" width="#{TABLE_WIDTH}" height="#{TABLE_HEADER_HEIGHT}" fill="#ffe082"/>)
        parts << header_grid_lines(y, TABLE_HEADER_HEIGHT)
        COLUMNS.each do |col|
          next if col[:key] == :rank
          parts << %(<text x="#{col[:x]}" y="#{y + 24}" text-anchor="middle" class="base th">#{escape(col[:label])}</text>)
        end
        y += TABLE_HEADER_HEIGHT

        # data rows
        rows.each_with_index do |row, i|
          bg = i.even? ? "#ffffff" : "#f0f0f0"
          parts << %(<rect x="#{TABLE_LEFT}" y="#{y}" width="#{TABLE_WIDTH}" height="#{ROW_HEIGHT}" fill="#{bg}"/>)
          parts << header_grid_lines(y, ROW_HEIGHT)

          parts << %(<text x="#{COLUMNS[0][:x]}" y="#{y + 27}" text-anchor="middle" class="base td-rank">#{row[:rank]}</text>)
          parts << fit_text_svg(COLUMNS[1][:text_x], y + 27, row[:team].display_name, "td-team", "start", COLUMNS[1][:max_w], font_size: 18)
          parts << %(<text x="#{COLUMNS[2][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:wins]}</text>)
          parts << %(<text x="#{COLUMNS[3][:x]}" y="#{y + 27}" text-anchor="middle" class="base td-pts">#{row[:points]}</text>)
          parts << %(<text x="#{COLUMNS[4][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:round_wins]}</text>)
          parts << %(<text x="#{COLUMNS[5][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:round_losses]}</text>)
          parts << %(<text x="#{COLUMNS[6][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:goal_diff]}</text>)
          parts << %(<text x="#{COLUMNS[7][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:round_board_diff]}</text>)
          parts << %(<text x="#{COLUMNS[8][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:match_game_diff]}</text>)
          parts << %(<text x="#{COLUMNS[9][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:board_wins_total]}</text>)

          y += ROW_HEIGHT
        end

        y += GROUP_GAP
      end

      parts.join("\n")
    end

    def header_grid_lines(y, height)
      COL_BORDERS.map do |x|
        %(<line x1="#{x}" y1="#{y}" x2="#{x}" y2="#{y + height}" stroke="#b0b0b0" stroke-width="1"/>)
      end.join("\n")
    end

    def fit_text_svg(x, y, text, klass, anchor, max_width, font_size:)
      content = text.to_s.strip.presence || "-"
      escaped = escape(content)
      estimated_width = content.each_char.sum { |char| char.bytesize > 1 ? font_size * 1.0 : font_size * 0.6 }
      attrs = %{x="#{x}" y="#{y}" text-anchor="#{anchor}" class="base #{klass}"}

      if estimated_width > max_width
        %(<text #{attrs} textLength="#{max_width}" lengthAdjust="spacingAndGlyphs">#{escaped}</text>)
      else
        %(<text #{attrs}>#{escaped}</text>)
      end
    end

    def escape(text)
      CGI.escapeHTML(text.to_s)
    end
  end
end
