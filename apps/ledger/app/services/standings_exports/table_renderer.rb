require "fileutils"
require "erb"

module StandingsExports
  class TableRenderer
    OUTPUT_DIR = Rails.root.join("public", "generated", "standings_exports")

    def initialize(phase, standings_by_block, blocks)
      @phase = phase
      @standings_by_block = standings_by_block
      @blocks = blocks
    end

    def render!
      FileUtils.mkdir_p(OUTPUT_DIR)

      browser = Ferrum::Browser.new(
        headless: "new",
        browser_path: ENV["CHROMIUM_PATH"],
        window_size: [1024, 800],
        args: ["--no-sandbox", "--disable-gpu"]
      )
      begin
        page = browser.create_page
        page.main_frame.set_content(html_document)
        height = page.evaluate("document.documentElement.scrollHeight")
        page.set_viewport(width: 1024, height: height)
        page.screenshot(path: output_path.to_s, format: "png", full: true)
      ensure
        browser.quit
      end

      output_path
    end

    private

    def output_path
      OUTPUT_DIR.join("#{@phase.id}.png")
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
              width: 1024px;
              background: #e8e8e8;
              font-family: 'Noto Sans', 'Noto Sans CJK JP', sans-serif;
            }

            .hero {
              height: 170px;
              background: linear-gradient(to right, #cf3215, #111827, #22d3ee);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .hero-sub { color: #94a3b8; font-size: 26px; font-weight: 700; }
            .hero-title { color: #f8fafc; font-size: 58px; font-weight: 800; letter-spacing: 2px; }

            .group-title {
              background: #0f172a;
              color: #fff;
              text-align: center;
              font-size: 22px;
              font-weight: 800;
              padding: 8px 0;
            }

            .block-table { margin-bottom: 8px; }

            table {
              width: 100%;
              border-collapse: collapse;
              font-variant-numeric: tabular-nums;
              table-layout: fixed;
            }

            col.c-rank { width: 36px; }
            col.c-team { width: 240px; }
            col.c-stat { width: 64px; }
            col.c-diff { width: 72px; }
            col.c-wide { width: 88px; }

            th {
              background: #ffe082;
              color: #111827;
              font-size: 13px;
              font-weight: 800;
              padding: 8px 4px;
              border: 1px solid #b0b0b0;
              text-align: center;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            td {
              font-size: 16px;
              font-weight: 600;
              padding: 8px 4px;
              border: 1px solid #d0d0d0;
              text-align: center;
              color: #111827;
            }

            tr:nth-child(odd) td { background: #fff; }
            tr:nth-child(even) td { background: #f0f0f0; }

            .rank { font-size: 18px; font-weight: 800; font-style: italic; }
            .team {
              text-align: left;
              padding-left: 8px;
              font-weight: 700;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .pts { font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="hero">
            <div class="hero-sub">MASTER DUEL</div>
            <div class="hero-title">WMGP STANDINGS</div>
            <div class="hero-sub">Katorin2 Match Ledger</div>
          </div>
          #{blocks_html}
        </body>
        </html>
      HTML
    end

    def blocks_html
      @blocks.map do |_block_id, block|
        rows = @standings_by_block[block.id] || []
        <<~HTML
          <div class="block-table">
            <div class="group-title">#{h block.name}</div>
            <table>
              <colgroup>
                <col class="c-rank"><col class="c-team">
                <col class="c-stat"><col class="c-stat">
                <col class="c-stat"><col class="c-stat">
                <col class="c-diff"><col class="c-wide">
                <col class="c-wide"><col class="c-wide">
              </colgroup>
              <thead><tr>
                <th></th><th>チーム名</th><th>勝利数</th><th>勝点</th>
                <th>得点</th><th>失点</th><th>得失点</th>
                <th>R得失点</th><th>M得失点</th><th>R総得点</th>
              </tr></thead>
              <tbody>#{rows.map { |r| row_html(r) }.join}</tbody>
            </table>
          </div>
        HTML
      end.join
    end

    def row_html(row)
      <<~HTML
        <tr>
          <td class="rank">#{h row[:rank]}</td>
          <td class="team">#{h row[:team].display_name}</td>
          <td>#{h row[:wins]}</td>
          <td class="pts">#{h row[:points]}</td>
          <td>#{h row[:round_wins]}</td>
          <td>#{h row[:round_losses]}</td>
          <td>#{h row[:goal_diff]}</td>
          <td>#{h row[:round_board_diff]}</td>
          <td>#{h row[:match_game_diff]}</td>
          <td>#{h row[:board_wins_total]}</td>
        </tr>
      HTML
    end
  end
end
