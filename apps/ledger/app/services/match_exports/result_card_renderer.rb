require "fileutils"
require "erb"
require "base64"

module MatchExports
  class ResultCardRenderer
    EXPORT_TYPE = "match_result_card".freeze
    RENDERER_KEY = "match_result_card_v2".freeze
    WIDTH = 1024
    MIN_HEIGHT = 1449
    BROWSER_TIMEOUT = 30
    OUTPUT_DIR = Rails.root.join("public", "generated", "match_exports")

    def initialize(match)
      @match = match
    end

    def render!
      if fresh?
        return match.exports.find_by(export_type: EXPORT_TYPE)
      end

      FileUtils.mkdir_p(OUTPUT_DIR)

      browser = Ferrum::Browser.new(
        headless: "new",
        browser_path: ENV["CHROMIUM_PATH"],
        window_size: [WIDTH, MIN_HEIGHT],
        timeout: BROWSER_TIMEOUT,
        args: ["--no-sandbox", "--disable-gpu"]
      )
      begin
        page = browser.create_page
        page.main_frame.set_content(html_document)
        height = page.evaluate("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
        page.set_viewport(width: WIDTH, height: [height.to_i, MIN_HEIGHT].max)
        page.screenshot(path: output_path.to_s, format: "png", full: true)
      ensure
        browser.quit
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

    def fresh_export_available?
      fresh?
    end

    private

    attr_reader :match

    def output_path
      OUTPUT_DIR.join("#{match.id}.png")
    end

    def public_file_path
      "/generated/match_exports/#{match.id}.png"
    end

    def fresh?
      return false unless output_path.exist?

      export = match.exports.find_by(export_type: EXPORT_TYPE)
      return false unless export&.generated_at

      last_change = [
        match.match_result&.updated_at,
        match.rounds.maximum(:updated_at)
      ].compact.max
      return true unless last_change

      export.generated_at >= last_change
    end

    def h(value)
      ERB::Util.html_escape(value.to_s)
    end

    def html_document
      <<~HTML
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: #{WIDTH}px;
              min-height: #{MIN_HEIGHT}px;
              font-family: 'Noto Sans', 'Noto Sans CJK JP', sans-serif;
              #{canvas_background_css}
            }

            .hero {
              height: 170px;
              background: linear-gradient(to right, #cf3215, #111827, #22d3ee);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .hero::after {
              content: '';
              position: absolute;
              inset: 0;
              background: rgba(8, 15, 31, 0.32);
            }
            .hero > * { position: relative; z-index: 1; }
            .hero-sub { color: #94a3b8; font-size: 26px; font-weight: 700; }
            .hero-title { color: #f8fafc; font-size: 58px; font-weight: 800; letter-spacing: 2px; }

            .meta-bar {
              background: #27447f;
              height: 58px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 18px;
              color: #f8fafc;
              font-size: 26px;
              font-weight: 700;
            }
            .meta-bar .label { font-size: 16px; color: #dbeafe; margin-right: 8px; }

            .versus {
              display: flex;
              margin: 18px 20px 0;
              height: 160px;
            }
            .versus-team {
              flex: 1;
              background: #0f172a;
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 0 20px;
              overflow: hidden;
            }
            .versus-team.home { flex-direction: row; }
            .versus-team.away { flex-direction: row-reverse; }
            .team-name {
              color: #fff;
              font-size: 28px;
              font-weight: 800;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 200px;
            }
            .player-list { display: flex; flex-direction: column; gap: 4px; }
            .player-tag {
              background: #ffe082;
              color: #111827;
              font-size: 16px;
              font-weight: 700;
              padding: 6px 12px;
              border: 1px solid #111827;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 150px;
              text-align: center;
            }
            .versus-center {
              width: 240px;
              flex-shrink: 0;
              background: #18346a;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #f8fafc;
              font-size: 58px;
              font-weight: 800;
            }

            .round-section { margin: 0 20px; }
            .round-header {
              background: #0f172a;
              color: #f8fafc;
              text-align: center;
              font-size: 28px;
              font-weight: 800;
              padding: 6px 0;
              margin-top: 24px;
            }

            .board-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-variant-numeric: tabular-nums;
            }
            .board-table th {
              background: #111827;
              color: #f8fafc;
              font-size: 19px;
              font-weight: 800;
              padding: 6px 4px;
              height: 42px;
              line-height: 1.05;
              text-align: center;
              vertical-align: middle;
            }
            .board-table td {
              background: #ffe082;
              color: #111827;
              font-size: 20px;
              font-weight: 700;
              padding: 10px 4px;
              height: 60px;
              line-height: 1.15;
              text-align: center;
              vertical-align: middle;
              border: 1px solid #111827;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .board-table .score-cell {
              font-size: 26px;
              font-weight: 800;
              line-height: 1;
            }
            col.c-player { width: 16%; }
            col.c-deck { width: 26%; }
            col.c-score { width: 16%; }

            .round-result {
              display: flex;
              justify-content: center;
              gap: 80px;
              padding: 4px 0;
              font-size: 28px;
              font-weight: 900;
              line-height: 1;
            }
            .win { color: #ef4444; }
            .lose { color: #2563eb; }

            .footer {
              background: #0f172a;
              margin: 24px 20px 0;
              height: 70px;
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
              align-items: center;
              column-gap: 32px;
              padding: 0 28px;
            }
            .footer-team {
              color: #fff;
              font-size: 34px;
              font-weight: 800;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1;
            }
            .footer-team.home {
              text-align: right;
            }
            .footer-team.away {
              text-align: left;
            }
            .footer-score {
              color: #fff;
              font-size: 42px;
              font-weight: 900;
              min-width: 120px;
              text-align: center;
              line-height: 1;
            }
          </style>
        </head>
        <body>
          #{hero_html}
          #{meta_bar_html}
          #{versus_html}
          #{rounds_html}
          #{footer_html}
        </body>
        </html>
      HTML
    end

    def canvas_background_css
      if match.league.header_image.attached?
        data_uri = header_image_data_uri
        "background: url('#{data_uri}') center/cover; position: relative;"
      else
        "background: linear-gradient(135deg, #d9e2f7, #edf2ff);"
      end
    end

    def hero_html
      <<~HTML
        <div class="hero">
          <div class="hero-sub">MASTER DUEL</div>
          <div class="hero-title">WMGP RESULT</div>
          <div class="hero-sub">Katorin2 Match Ledger</div>
        </div>
      HTML
    end

    def meta_bar_html
      <<~HTML
        <div class="meta-bar">
          <div><span class="label">JUDGE:</span>#{h(match.judge_name.presence || "-")}</div>
          <div>#{h week_label}</div>
          <div>#{h scheduled_label}</div>
        </div>
      HTML
    end

    def versus_html
      left_players = header_players("home")
      right_players = header_players("away")
      <<~HTML
        <div class="versus">
          <div class="versus-team home">
            <div class="team-name">#{h match.home_team.display_name}</div>
            <div class="player-list">
              #{left_players.map { |n| %(<div class="player-tag">#{h n}</div>) }.join}
            </div>
          </div>
          <div class="versus-center">#{h I18n.t("labels.vs")}</div>
          <div class="versus-team away">
            <div class="team-name">#{h match.away_team.display_name}</div>
            <div class="player-list">
              #{right_players.map { |n| %(<div class="player-tag">#{h n}</div>) }.join}
            </div>
          </div>
        </div>
      HTML
    end

    def rounds_html
      rounds = match.rounds.index_by(&:number)
      (1..3).map do |round_number|
        round = rounds[round_number]
        round_section_html(round_number, round)
      end.join
    end

    def round_section_html(round_number, round)
      boards = round&.board_results&.index_by(&:board_number) || {}
      <<~HTML
        <div class="round-section">
          <div class="round-header">ROUND#{round_number}</div>
          <table class="board-table">
            <colgroup>
              <col class="c-player"><col class="c-deck"><col class="c-score"><col class="c-deck"><col class="c-player">
            </colgroup>
            <thead><tr>
              <th>PLAYER</th><th>DECK</th><th>SCORE</th><th>DECK</th><th>PLAYER</th>
            </tr></thead>
            <tbody>
              #{(1..3).map { |bn| board_row_html(boards[bn], bn) }.join}
            </tbody>
          </table>
          #{round_result_html(round)}
        </div>
      HTML
    end

    def board_row_html(board, board_number)
      board ||= BoardResult.new(board_number: board_number)
      <<~HTML
        <tr>
          <td>#{h(board.home_participant&.display_name || "-")}</td>
          <td>#{h(board.home_deck_name.presence || "-")}</td>
          <td class="score-cell">#{h(board.score_text || "- -")}</td>
          <td>#{h(board.away_deck_name.presence || "-")}</td>
          <td>#{h(board.away_participant&.display_name || "-")}</td>
        </tr>
      HTML
    end

    def round_result_html(round)
      home_label, away_label =
        case round&.winner_team_id
        when match.home_team_id then ["W", "L"]
        when match.away_team_id then ["L", "W"]
        else ["-", "-"]
        end
      <<~HTML
        <div class="round-result">
          <span class="win">#{home_label}</span>
          <span class="lose">#{away_label}</span>
        </div>
      HTML
    end

    def footer_html
      result = match.match_result
      home_score = result&.home_round_wins.to_i
      away_score = result&.away_round_wins.to_i
      <<~HTML
        <div class="footer">
          <div class="footer-team home">#{h match.home_team.display_name}</div>
          <div class="footer-score">#{home_score} - #{away_score}</div>
          <div class="footer-team away">#{h match.away_team.display_name}</div>
        </div>
      HTML
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

    def header_image_data_uri
      blob = match.league.header_image.blob
      encoded = Base64.strict_encode64(match.league.header_image.download)
      "data:#{blob.content_type};base64,#{encoded}"
    end
  end
end
