# 順位表画像出力 設計書

## 概要

順位表をPNG画像として出力する。既存の `MatchExports::ResultCardRenderer` と同じパイプライン（SVG → MiniMagick → PNG）を使う。

## レイアウト

```
┌─────────────────────────────────────────────┐
│          ダークヒーローヘッダー (170px)        │
│     WMGP STANDINGS / Katorin2 Match Ledger  │
├─────────────────────────────────────────────┤
│              Group A (中央寄せ)               │ 35px
├───┬────────┬────┬────┬────┬────┬─────┬─────┤
│   │チーム名 │勝利│勝点│得点│失点│得失点│R得失│... │ 35px ヘッダー(オレンジ)
├───┼────────┼────┼────┼────┼────┼─────┼─────┤
│ 1 │三戦の才 │  6 │ 18 │ 12 │  4 │   8 │  18│... │ 40px × チーム数
│ 2 │Raid...  │  6 │ 18 │ 13 │  5 │   8 │  16│... │ (白/灰交互)
│...│        │    │    │    │    │     │    │    │
├───┴────────┴────┴────┴────┴────┴─────┴─────┤
│              Group B                        │ 以下同様
│...                                          │
└─────────────────────────────────────────────┘
```

## 定数

```ruby
WIDTH = 1024
HERO_HEIGHT = 170
GROUP_TITLE_HEIGHT = 35
TABLE_HEADER_HEIGHT = 36
ROW_HEIGHT = 40
GROUP_GAP = 8
TABLE_LEFT = 20
TABLE_WIDTH = 984
FONT_FAMILY = "'Noto Sans CJK JP', 'Noto Sans CJK', 'Noto Color Emoji', sans-serif"
```

## カラム定義

テーブル左端 = TABLE_LEFT (20)。各カラムは左端からの相対位置で text-anchor="middle" で中央揃え。チーム名だけ text-anchor="middle"。

```ruby
COLUMNS = [
  { key: :rank,             label_ja: "",           width: 36,  x_center: 38 },
  { key: :team,             label_ja: "チーム名",     width: 168, x_center: 140 },
  { key: :wins,             label_ja: "勝利数",      width: 76,  x_center: 260 },
  { key: :points,           label_ja: "勝点",        width: 76,  x_center: 336 },
  { key: :round_wins,       label_ja: "得点",        width: 76,  x_center: 412 },
  { key: :round_losses,     label_ja: "失点",        width: 76,  x_center: 488 },
  { key: :goal_diff,        label_ja: "得失点",      width: 92,  x_center: 572 },
  { key: :round_board_diff, label_ja: "ラウンド得失点", width: 120, x_center: 668 },
  { key: :match_game_diff,  label_ja: "マッチ得失点",  width: 120, x_center: 788 },
  { key: :board_wins_total, label_ja: "ラウンド総得点", width: 120, x_center: 908 },
]
```

## 色

- ヒーローヘッダー: `#heroGradient`（既存と同じ赤→ダーク→シアン）
- グループタイトル背景: `#0f172a`（ダーク）、テキスト白
- テーブルヘッダー背景: `#ffe082`（オレンジ/ゴールド）、テキスト `#111827`
- 偶数行: `#ffffff`
- 奇数行: `#f0f0f0`
- セル罫線: `#d0d0d0`
- 順位列のテキスト: `#111827` 太字イタリック風

## 実装

### 1. サービスクラス: `app/services/standings_exports/table_renderer.rb`

```ruby
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

    COLUMNS = [
      { key: :rank,             label: "",              x: 38  },
      { key: :team,             label: "チーム名",       x: 140 },
      { key: :wins,             label: "勝利数",         x: 260 },
      { key: :points,           label: "勝点",           x: 336 },
      { key: :round_wins,       label: "得点",           x: 412 },
      { key: :round_losses,     label: "失点",           x: 488 },
      { key: :goal_diff,        label: "得失点",         x: 572 },
      { key: :round_board_diff, label: "ラウンド得失点",  x: 668 },
      { key: :match_game_diff,  label: "マッチ得失点",    x: 788 },
      { key: :board_wins_total, label: "ラウンド総得点",  x: 908 },
    ].freeze

    # column boundaries for vertical grid lines (between columns)
    COL_BORDERS = [56, 224, 298, 374, 450, 526, 618, 728, 848].freeze

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
              .td { font-size: 18px; font-weight: 600; fill: #111827; }
              .td-rank { font-size: 20px; font-weight: 800; font-style: italic; fill: #111827; }
              .td-team { font-size: 18px; font-weight: 700; fill: #111827; }
              .td-pts { font-size: 18px; font-weight: 800; fill: #111827; }
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

          # rank
          parts << %(<text x="#{COLUMNS[0][:x]}" y="#{y + 27}" text-anchor="middle" class="base td-rank">#{row[:rank]}</text>)
          # team name - use fit_text_svg for long names
          parts << fit_text_svg(COLUMNS[1][:x], y + 27, row[:team].display_name, "td-team", "middle", 160, font_size: 18)
          # wins
          parts << %(<text x="#{COLUMNS[2][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:wins]}</text>)
          # points
          parts << %(<text x="#{COLUMNS[3][:x]}" y="#{y + 27}" text-anchor="middle" class="base td-pts">#{row[:points]}</text>)
          # round_wins
          parts << %(<text x="#{COLUMNS[4][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:round_wins]}</text>)
          # round_losses
          parts << %(<text x="#{COLUMNS[5][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:round_losses]}</text>)
          # goal_diff
          parts << %(<text x="#{COLUMNS[6][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:goal_diff]}</text>)
          # round_board_diff
          parts << %(<text x="#{COLUMNS[7][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:round_board_diff]}</text>)
          # match_game_diff
          parts << %(<text x="#{COLUMNS[8][:x]}" y="#{y + 27}" text-anchor="middle" class="base td">#{row[:match_game_diff]}</text>)
          # board_wins_total
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
```

### 2. コントローラー修正: standings_controller.rb にダウンロードアクション追加

```ruby
class StandingsController < ApplicationController
  before_action :set_phase

  def show
    @standings_by_block = Standings::Calculator.call(@phase)
    @blocks = @phase.blocks.order(:position).index_by(&:id)
  end

  def download
    standings_by_block = Standings::Calculator.call(@phase)
    blocks = @phase.blocks.order(:position).index_by(&:id)

    renderer = StandingsExports::TableRenderer.new(@phase, standings_by_block, blocks)
    output_path = renderer.render!

    phase_label = @phase.name.presence || @phase.kind
    filename = "standings-#{phase_label}.png".gsub(/[^\w.\-]/, "_")
    send_file output_path, filename: filename, type: "image/png", disposition: "attachment"
  rescue => e
    redirect_to league_phase_standings_path(league_id: @league, phase_id: @phase),
      alert: t("flash.standings.export_failed", message: e.message)
  end

  private

  def set_phase
    @phase = Phase.joins(:league)
      .where(id: params[:phase_id], leagues: { organizer_account_id: current_organizer_account.id })
      .first!
    @league = @phase.league
  end
end
```

### 3. ルーティング

`config/routes.rb` の既存 `resource :standings` を変更:

```ruby
resource :standings, only: :show, controller: 'standings' do
  get :download, on: :member
end
```

URL: `GET /leagues/:league_id/phases/:phase_id/standings/download`

### 4. ビューにダウンロードボタン追加

`app/views/standings/show.html.erb` の page-actions 内に追加:

```erb
<%= link_to t("standings.download"), download_league_phase_standings_path(league_id: @league, phase_id: @phase), class: "button button--primary" %>
```

### 5. i18n追加

ja.yml の standings セクションに追加:
```yaml
    download: 画像をダウンロード
```

en.yml の standings セクションに追加:
```yaml
    download: Download Image
```

flash の standings セクション追加（ja.yml）:
```yaml
  flash:
    standings:
      export_failed: "順位表画像の出力に失敗しました: %{message}"
```

flash（en.yml）:
```yaml
  flash:
    standings:
      export_failed: "Standings export failed: %{message}"
```

## ファイル一覧

| ファイル | 操作 |
|---------|------|
| `app/services/standings_exports/table_renderer.rb` | 新規作成 |
| `app/controllers/standings_controller.rb` | 編集（downloadアクション追加） |
| `config/routes.rb` | 編集（download ルート追加） |
| `app/views/standings/show.html.erb` | 編集（ダウンロードボタン追加） |
| `config/locales/ja.yml` | 編集（download + flash追加） |
| `config/locales/en.yml` | 編集（download + flash追加） |
