# ランキング（順位表）機能 設計書

## 概要

フェーズ（予選ステージ）のブロック別順位表を、DBの対戦結果データから自動計算して表示する。
現在は手動のExcelシートで成績計算しているが、Katorin2のDBデータから自動計算・表示に置き換える。

## 計算ルール

### チーム成績の集計項目

| 項目 | 計算方法 |
|------|---------|
| 勝利数 | `match_results.winner_team_id == team.id` の件数（BYE除外） |
| 勝点 | 勝利数 × 3 |
| 得点 | 全マッチのラウンド勝数合計（home時: `home_round_wins`, away時: `away_round_wins`） |
| 失点 | 全マッチの相手ラウンド勝数合計 |
| 得失点 | 得点 - 失点 |
| ラウンド得失点 | 全ラウンドの「勝ち卓数 - 負け卓数」の合計 |
| マッチ得失点 | 全卓の「自チームゲーム勝数 - 相手ゲーム勝数」の合計 |
| ラウンド総得点 | 全ラウンドの勝ち卓数の合計 |

### 計算の詳細

**ラウンド得失点の計算:**
- 各ラウンドについて、board_resultsのwinner_sideを見る
- チームがhome側: `winner_side == "home"` なら勝ち卓、`winner_side == "away"` なら負け卓
- チームがaway側: その逆
- 全ラウンドの (勝ち卓数 - 負け卓数) を合計

**マッチ得失点の計算:**
- 全board_resultsについて、チームのゲーム勝数と相手のゲーム勝数を合計
- チームがhome側: `home_game_wins` が自チーム、`away_game_wins` が相手
- チームがaway側: その逆
- (自チームゲーム勝数合計 - 相手ゲーム勝数合計)

**ラウンド総得点の計算:**
- 全ラウンドの勝ち卓数（board_resultsでwinner_sideが自チーム側の件数）を合計

### 順位決定

順位計算用スコア:
```
score = 勝点 × 10000 + ラウンド得失点 × 1000 + マッチ得失点 × 100 + ラウンド総得点 × 10
```

ブロック内でscoreの降順にRANKする。同スコアは同順位。

## データソース

```
Phase → has_many :matches
Match → belongs_to :home_team, :away_team
      → has_one :match_result (winner_team_id, home_round_wins, away_round_wins)
      → has_many :rounds
Round → belongs_to :home_team, :away_team, :winner_team
      → has_many :board_results
BoardResult → winner_side (home/away), home_game_wins, away_game_wins
Team → belongs_to :block
Block → belongs_to :phase
```

対象マッチ: `match_result.decision_type != "bye"` かつ `match_result` が存在するもの。

## 実装

### 1. サービスクラス: `app/services/standings/calculator.rb`

```ruby
module Standings
  class Calculator
    # @param phase [Phase] 対象フェーズ
    # @return [Hash<Integer, Array<Hash>>] block_id => [team_standing, ...]
    def self.call(phase)
      new(phase).call
    end

    def initialize(phase)
      @phase = phase
    end

    def call
      # 1. フェーズのマッチと関連データを一括取得
      matches = @phase.matches
        .joins(:match_result)
        .where.not(match_results: { decision_type: "bye" })
        .includes(:match_result, rounds: :board_results)

      # 2. チームごとに集計
      team_stats = Hash.new { |h, k| h[k] = empty_stats }

      matches.each do |match|
        mr = match.match_result
        next unless mr

        [match.home_team_id, match.away_team_id].compact.each do |team_id|
          is_home = (team_id == match.home_team_id)
          stats = team_stats[team_id]

          # 勝利数
          stats[:wins] += 1 if mr.winner_team_id == team_id

          # 得点・失点（ラウンド勝数）
          if is_home
            stats[:round_wins] += mr.home_round_wins.to_i
            stats[:round_losses] += mr.away_round_wins.to_i
          else
            stats[:round_wins] += mr.away_round_wins.to_i
            stats[:round_losses] += mr.home_round_wins.to_i
          end

          # ラウンド・卓レベルの集計
          match.rounds.each do |round|
            round_side = if team_id == round.home_team_id
                           :home
                         elsif team_id == round.away_team_id
                           :away
                         else
                           next
                         end

            boards_won = 0
            boards_lost = 0

            round.board_results.each do |br|
              next unless br.winner_side.present?

              if round_side == :home
                boards_won += 1 if br.winner_side == "home"
                boards_lost += 1 if br.winner_side == "away"
                stats[:game_wins] += br.home_game_wins.to_i
                stats[:game_losses] += br.away_game_wins.to_i
              else
                boards_won += 1 if br.winner_side == "away"
                boards_lost += 1 if br.winner_side == "home"
                stats[:game_wins] += br.away_game_wins.to_i
                stats[:game_losses] += br.home_game_wins.to_i
              end
            end

            stats[:board_wins] += boards_won
            stats[:board_losses] += boards_lost
          end
        end
      end

      # 3. チーム情報を取得してブロック別にまとめる
      teams = @phase.league.teams
        .where(id: team_stats.keys)
        .includes(:block)
        .index_by(&:id)

      # ブロック未割当チームも含める（ブロック内の全チームを対象）
      @phase.blocks.includes(:teams).each do |block|
        block.teams.each do |team|
          team_stats[team.id] # ensure entry exists
          teams[team.id] ||= team
        end
      end

      # 4. 順位表を構築
      standings_by_block = {}

      teams.values.group_by { |t| t.block_id }.each do |block_id, block_teams|
        next unless block_id

        rows = block_teams.map do |team|
          s = team_stats[team.id]
          points = s[:wins] * 3
          goal_diff = s[:round_wins] - s[:round_losses]
          round_board_diff = s[:board_wins] - s[:board_losses]
          match_game_diff = s[:game_wins] - s[:game_losses]

          {
            team: team,
            wins: s[:wins],
            points: points,
            round_wins: s[:round_wins],
            round_losses: s[:round_losses],
            goal_diff: goal_diff,
            round_board_diff: round_board_diff,
            match_game_diff: match_game_diff,
            board_wins_total: s[:board_wins],
            ranking_score: points * 10000 + round_board_diff * 1000 + match_game_diff * 100 + s[:board_wins] * 10
          }
        end

        # スコア降順ソート
        rows.sort_by! { |r| -r[:ranking_score] }

        # 順位付与（同スコアは同順位）
        rows.each_with_index do |row, i|
          row[:rank] = if i == 0
                         1
                       elsif row[:ranking_score] == rows[i - 1][:ranking_score]
                         rows[i - 1][:rank]
                       else
                         i + 1
                       end
        end

        standings_by_block[block_id] = rows
      end

      standings_by_block
    end

    private

    def empty_stats
      {
        wins: 0, round_wins: 0, round_losses: 0,
        board_wins: 0, board_losses: 0,
        game_wins: 0, game_losses: 0
      }
    end
  end
end
```

### 2. コントローラー: `app/controllers/standings_controller.rb`

```ruby
class StandingsController < ApplicationController
  before_action :require_organizer_session
  before_action :set_phase

  def show
    @standings_by_block = Standings::Calculator.call(@phase)
    @blocks = @phase.blocks.order(:position).index_by(&:id)
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

`config/routes.rb` の `resources :phases` ブロック内（既存のmemberルートと同じ場所）に追加:

```ruby
resources :leagues, only: [...] do
  resources :phases, only: [...] do
    member do
      # ...existing routes...
    end
    resource :standings, only: :show, controller: "standings"
  end
end
```

URL: `/leagues/:league_id/phases/:phase_id/standings`

### 4. ビュー: `app/views/standings/show.html.erb`

既存のビューパターンに合わせる:
- `page_title` + `set_breadcrumbs` ヘルパー
- `.page-header` + `.panel` 構造
- テーブルは `<table class="standings-table">` で新規CSS追加

```erb
<% page_title t("standings.title", phase: @phase.name.presence || translated_enum("enums.phase.kind", @phase.kind)) %>
<% set_breadcrumbs([
  breadcrumb_item(t("nav.leagues"), leagues_path),
  breadcrumb_item(@league.name, league_path(@league)),
  breadcrumb_item(@phase.name.presence || translated_enum("enums.phase.kind", @phase.kind), league_phase_path(league_id: @league, id: @phase)),
  breadcrumb_item(t("standings.eyebrow"), nil, current: true)
]) %>

<section class="page-header">
  <div>
    <p class="eyebrow"><%= t("standings.eyebrow") %></p>
    <h1><%= t("standings.title", phase: @phase.name.presence || translated_enum("enums.phase.kind", @phase.kind)) %></h1>
    <p class="muted"><%= t("standings.lede") %></p>
  </div>
  <div class="page-actions">
    <%= link_to t("actions.back"), league_phase_path(league_id: @league, id: @phase), class: "button" %>
  </div>
</section>

<% @blocks.each do |block_id, block| %>
  <% rows = @standings_by_block[block_id] || [] %>
  <section class="panel">
    <h2><%= block.name %></h2>
    <% if rows.any? %>
      <div class="table-scroll">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="standings-rank"><%= t("standings.columns.rank") %></th>
              <th class="standings-team"><%= t("standings.columns.team") %></th>
              <th><%= t("standings.columns.wins") %></th>
              <th><%= t("standings.columns.points") %></th>
              <th><%= t("standings.columns.round_wins") %></th>
              <th><%= t("standings.columns.round_losses") %></th>
              <th><%= t("standings.columns.goal_diff") %></th>
              <th><%= t("standings.columns.round_board_diff") %></th>
              <th><%= t("standings.columns.match_game_diff") %></th>
              <th><%= t("standings.columns.board_wins_total") %></th>
            </tr>
          </thead>
          <tbody>
            <% rows.each do |row| %>
              <tr>
                <td class="standings-rank"><%= row[:rank] %></td>
                <td class="standings-team"><%= row[:team].display_name %></td>
                <td><%= row[:wins] %></td>
                <td><%= row[:points] %></td>
                <td><%= row[:round_wins] %></td>
                <td><%= row[:round_losses] %></td>
                <td><%= row[:goal_diff] %></td>
                <td><%= row[:round_board_diff] %></td>
                <td><%= row[:match_game_diff] %></td>
                <td><%= row[:board_wins_total] %></td>
              </tr>
            <% end %>
          </tbody>
        </table>
      </div>
    <% else %>
      <p class="empty-copy"><%= t("standings.empty") %></p>
    <% end %>
  </section>
<% end %>
```

### 5. CSS追加: `app/assets/stylesheets/application.css`

末尾に追加:

```css
/* ── Standings table ── */
.table-scroll { overflow-x: auto; }
.standings-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.standings-table th,
.standings-table td { padding: .5rem .75rem; text-align: right; border-bottom: 1px solid var(--rule); white-space: nowrap; }
.standings-table th { font-size: .75rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.standings-table .standings-rank { text-align: center; width: 3rem; }
.standings-table .standings-team { text-align: left; font-weight: 600; }
.standings-table tbody tr:hover { background: var(--bg-hover, rgba(0,0,0,.03)); }
```

### 6. i18n

**ja.yml** に追加:
```yaml
ja:
  standings:
    eyebrow: 順位表
    title: "%{phase} 順位表"
    lede: 対戦結果から自動計算したブロック別順位表です。
    empty: 対戦結果がまだありません。
    columns:
      rank: 順位
      team: チーム名
      wins: 勝利数
      points: 勝点
      round_wins: 得点
      round_losses: 失点
      goal_diff: 得失点
      round_board_diff: ラウンド得失点
      match_game_diff: マッチ得失点
      board_wins_total: ラウンド総得点
```

**en.yml** に追加:
```yaml
en:
  standings:
    eyebrow: Standings
    title: "%{phase} Standings"
    lede: Auto-calculated block standings from match results.
    empty: No match results yet.
    columns:
      rank: Rank
      team: Team
      wins: W
      points: Pts
      round_wins: RF
      round_losses: RA
      goal_diff: RD
      round_board_diff: BRD
      match_game_diff: MGD
      board_wins_total: BWT
```

### 7. フェーズ画面からのリンク

`app/views/phases/show.html.erb` に順位表へのリンクを追加:

```erb
<%= link_to t("standings.eyebrow"), phase_standings_path(phase_id: @phase), class: "button" %>
```

`page-actions` 内の適切な位置に配置する。

### 8. ナビゲーション

トップナビへの追加は不要（フェーズ詳細画面からのリンクで十分）。

## ファイル一覧

| ファイル | 操作 |
|---------|------|
| `app/services/standings/calculator.rb` | 新規作成 |
| `app/controllers/standings_controller.rb` | 新規作成 |
| `app/views/standings/show.html.erb` | 新規作成 |
| `config/routes.rb` | 編集（1箇所追加） |
| `config/locales/ja.yml` | 編集（standings追加） |
| `config/locales/en.yml` | 編集（standings追加） |
| `app/assets/stylesheets/application.css` | 編集（末尾にCSS追加） |
| `app/views/phases/show.html.erb` | 編集（リンク追加） |
