# 画面設計

## 画面一覧

### 共通・認証

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 1 | 共通 | ヘッダー/ナビゲーション | - | 1 |
| 2 | 認証 | ログイン | /login | 1 |
| 3 | 認証 | 新規登録 | /register | 1 |
| 4 | 認証 | パスワードリセット | /reset-password | 2 |

### 大会（単発）

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 5 | 大会 | 大会一覧 | /tournaments | 1 |
| 6 | 大会 | 大会詳細 | /tournaments/[id] | 1 |
| 7 | 大会 | 大会作成 | /tournaments/new | 1 |
| 8 | 大会 | 大会編集 | /tournaments/[id]/edit | 1 |
| 9 | 大会 | エントリーフォーム | /tournaments/[id]/entry | 1 |
| 10 | 大会 | 参加者一覧 | /tournaments/[id]/participants | 1 |
| 11 | 大会 | トーナメント表 | /tournaments/[id]/bracket | 1 |
| 12 | 大会 | 結果入力（主催者） | /tournaments/[id]/manage | 1 |
| 13 | 大会 | 結果報告（参加者） | /tournaments/[id]/report | 2 |

### シリーズ（長期大会）

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 14 | シリーズ | シリーズ一覧 | /series | 1 |
| 15 | シリーズ | シリーズ詳細 | /series/[id] | 1 |
| 16 | シリーズ | シリーズ作成 | /series/new | 1 |
| 17 | シリーズ | シリーズ編集 | /series/[id]/edit | 1 |
| 18 | シリーズ | ランキング | /series/[id]/ranking | 1 |

### チーム

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 19 | チーム | チーム一覧 | /teams | 1 |
| 20 | チーム | チーム詳細 | /teams/[id] | 1 |
| 21 | チーム | チーム作成 | /teams/new | 1 |
| 22 | チーム | チーム編集 | /teams/[id]/edit | 1 |
| 23 | チーム | メンバー管理 | /teams/[id]/members | 1 |
| 24 | チーム | 招待処理 | /teams/invite/[token] | 1 |

### ユーザー

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 25 | ユーザー | マイページ | /mypage | 1 |
| 26 | ユーザー | プロフィール編集 | /mypage/edit | 1 |
| 27 | ユーザー | 主催大会一覧 | /mypage/hosted | 1 |
| 28 | ユーザー | 参加大会一覧 | /mypage/joined | 1 |
| 29 | ユーザー | 所属チーム一覧 | /mypage/teams | 1 |

### 統計・分析

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 30 | 統計 | デッキマスタ管理 | /tournaments/[id]/decks | 1 |
| 31 | 統計 | 大会メタゲーム統計 | /tournaments/[id]/stats | 1 |
| 32 | 統計 | シリーズメタゲーム統計 | /series/[id]/stats | 1 |
| 33 | 統計 | チーム戦績詳細 | /teams/[id]/stats | 1 |

### SNS共有（画像生成）

| # | カテゴリ | 画面名 | URL | Phase |
|---|---------|--------|-----|-------|
| 34 | 共有 | 対戦カード生成 | /tournaments/[id]/share/match/[matchId] | 1 |
| 35 | 共有 | 結果カード生成 | /tournaments/[id]/share/result/[matchId] | 1 |
| 36 | 共有 | 大会結果サマリー | /tournaments/[id]/share/summary | 1 |
| 37 | 共有 | ラウンド対戦表 | /tournaments/[id]/share/round/[round] | 1 |
| 38 | 共有 | メタゲーム統計画像 | /tournaments/[id]/share/meta | 1 |
| 39 | 共有 | チーム戦績画像 | /teams/[id]/share/stats | 1 |

---

## 画面詳細

### 1. ヘッダー/ナビゲーション（共通）

**表示要素:**
- ロゴ（Katorin）→ トップへリンク
- ナビゲーション: 大会一覧 / シリーズ / チーム / マイページ
- 認証状態表示
  - 未ログイン: ログイン / 新規登録ボタン
  - ログイン済: ユーザー名 / ログアウト

**必要データ:**
- ログインユーザー情報（user_id, display_name, avatar_url）

---

### 2. ログイン画面 `/login`

**表示要素:**
- メールアドレス入力
- パスワード入力
- ログインボタン
- 新規登録リンク
- パスワードを忘れた方リンク
- （Phase 2）Discordでログインボタン

**必要データ:**
- 入力: email, password
- 出力: 認証トークン, ユーザー情報

---

### 3. 新規登録画面 `/register`

**表示要素:**
- メールアドレス入力
- パスワード入力
- パスワード確認入力
- 表示名入力
- 利用規約同意チェック
- 登録ボタン

**必要データ:**
- 入力: email, password, display_name
- 作成: users テーブルレコード

---

### 4. パスワードリセット画面 `/reset-password` (Phase 2)

**表示要素:**
- メールアドレス入力
- 送信ボタン
- （メール送信後）新パスワード入力フォーム

**必要データ:**
- 入力: email
- 処理: パスワードリセットトークン生成・メール送信

---

### 5. 大会一覧画面 `/tournaments`

**表示要素:**
- 検索バー（キーワード検索）
- フィルター
  - ステータス: 募集中 / 開催中 / 終了
  - 形式: シングルエリミ / ダブルエリミ / スイスドロー
  - 参加形式: 個人戦 / チーム戦
- 大会カード一覧
  - タイトル
  - ステータスバッジ
  - 個人戦/チーム戦バッジ
  - シリーズ名（所属時）
  - 説明（抜粋）
  - 形式 / 対戦形式
  - 参加者数 / 上限
  - 開催日時
  - 主催者名
- ページネーション

**必要データ:**
```
tournaments: [
  {
    id, title, description, status,
    tournament_format, match_format,
    entry_type: 'individual' | 'team',
    team_battle_format: 'knockout' | 'point' | null,
    participant_count, max_participants,
    start_at, entry_deadline,
    organizer: { display_name, avatar_url },
    series: { id, name } | null,
    cover_image_url
  }
]
```

---

### 6. 大会詳細画面 `/tournaments/[id]`

**表示要素:**
- カバー画像
- タイトル / ステータスバッジ / 参加形式バッジ
- シリーズ情報（所属時）
- 説明文（マークダウン対応）
- 大会情報テーブル
  - トーナメント形式
  - 対戦形式
  - 参加形式（個人戦/チーム戦）
  - チーム戦形式（勝ち抜き/ポイント制）※チーム戦時
  - チーム人数設定 ※チーム戦時
  - 開催日時
  - エントリー締切
  - 参加者数 / 上限
  - チェックイン: 有効/無効
  - 結果報告方式
- 主催者情報
- アクションボタン
  - 個人戦: 「エントリーする」
  - チーム戦: 「チームでエントリーする」（チームリーダーのみ）
  - 主催者: 「大会を管理」
- タブ
  - 概要
  - 参加者/チーム一覧
  - トーナメント表（開始後）

**必要データ:**
```
tournament: {
  id, title, description, status,
  tournament_format, match_format,
  entry_type, team_battle_format,
  team_size_min, team_size_max,
  start_at, entry_start_at, entry_deadline,
  participant_count, max_participants,
  check_in_enabled, check_in_start_at, check_in_deadline,
  result_report_mode,
  cover_image_url,
  series: { id, name } | null,
  organizer: { id, display_name, avatar_url, hosted_count },
  is_entered,
  is_organizer,
  my_team: { id, name, is_leader } | null  // チーム戦時
}
```

---

### 7. 大会作成画面 `/tournaments/new`

**表示要素:**
- 基本情報セクション
  - タイトル入力
  - 説明入力（マークダウンエディタ）
  - カバー画像アップロード
  - シリーズ選択（自分が主催するシリーズから選択、任意）
- 開催設定セクション
  - 開催日時（DateTimePicker）
  - 公開設定（公開/限定公開/非公開）
- 参加形式セクション
  - 参加形式選択（個人戦/チーム戦）
  - **チーム戦設定（チーム戦選択時）**
    - チーム戦形式（勝ち抜き戦/ポイント制）
    - チーム人数（最小〜最大）
    - チーム作成方式（ユーザー自由/主催者指定）
- エントリー設定セクション
  - エントリー開始日時
  - エントリー締切日時
  - 参加上限数（個人戦:人数/チーム戦:チーム数）
- トーナメント設定セクション
  - 形式選択（シングルエリミ/ダブルエリミ/スイスドロー）
  - 対戦形式（シングル戦/マッチ戦）
  - チェックイン有効/無効
  - 結果報告方式
- プレビュー / 作成ボタン

**必要データ（入力）:**
```
{
  title, description, cover_image,
  series_id: uuid | null,
  start_at, visibility,
  entry_type: 'individual' | 'team',
  // チーム戦時
  team_battle_format: 'knockout' | 'point',
  team_size_min, team_size_max,
  team_creation_mode: 'user' | 'organizer',
  //
  entry_start_at, entry_deadline, max_participants,
  tournament_format, match_format,
  check_in_enabled, check_in_start_at, check_in_deadline,
  result_report_mode
}
```

---

### 8. 大会編集画面 `/tournaments/[id]/edit`

**表示要素:**
- 大会作成画面と同様のフォーム
- 現在の値がプリフィル
- 編集制限（開始後は一部のみ）

---

### 9. エントリーフォーム `/tournaments/[id]/entry`

**表示要素:**
- 大会情報サマリー
- **個人戦の場合:**
  - マスターデュエルID（任意）
  - カスタム項目
- **チーム戦の場合:**
  - チーム選択（自分がリーダーのチームから）
  - 出場メンバー選択（チームメンバーから）
  - 出場順設定（勝ち抜き戦時）
- 注意事項・ルール確認チェック
- エントリーボタン

**必要データ（入力）:**
```
// 個人戦
{
  tournament_id, user_id,
  master_duel_id, custom_answers
}

// チーム戦
{
  tournament_id, team_id,
  roster: [
    { user_id, order }  // 出場メンバーと順番
  ]
}
```

---

### 10. 参加者一覧 `/tournaments/[id]/participants`

**表示要素:**
- **個人戦:**
  - 参加者数表示
  - 参加者テーブル（表示名、ID、チェックイン状態）
- **チーム戦:**
  - 参加チーム数表示
  - チームテーブル
    - チーム名
    - メンバー一覧（出場順）
    - チェックイン状態

**必要データ:**
```
// 個人戦
participants: [
  { id, user: { display_name, avatar_url }, ... }
]

// チーム戦
team_entries: [
  {
    id, team: { id, name, avatar_url },
    roster: [
      { user: { display_name }, order }
    ],
    check_in_status
  }
]
```

---

### 11. トーナメント表 `/tournaments/[id]/bracket`

**表示要素:**
- 形式に応じたブラケット表示
- **チーム戦の場合:**
  - チーム名で表示
  - 詳細展開でメンバー対戦結果を表示
  - 勝ち抜き戦: 各個人戦の勝敗
  - ポイント制: メンバーごとの勝敗とチーム合計

**必要データ:**
```
bracket: {
  format, entry_type,
  rounds: [...],
  // チーム戦時
  team_match_details: {
    match_id: {
      team1_wins, team2_wins,
      individual_matches: [
        { player1, player2, winner_id, score }
      ]
    }
  }
}
```

---

### 12. 結果入力（主催者）`/tournaments/[id]/manage`

**表示要素:**
- 大会ステータス管理
- **チーム戦の場合:**
  - チーム対戦カード
  - 各メンバー戦の結果入力
  - チーム勝敗の自動/手動判定

---

### 13. 結果報告（参加者）`/tournaments/[id]/report` (Phase 2)

省略（Phase 2）

---

### 14. シリーズ一覧 `/series`

**表示要素:**
- 検索バー
- フィルター
  - ステータス: 開催中 / 終了
  - 参加形式: 個人戦 / チーム戦
- シリーズカード一覧
  - タイトル
  - ステータスバッジ
  - 説明（抜粋）
  - 大会数
  - 参加者/チーム数
  - 期間
  - 主催者名

**必要データ:**
```
series_list: [
  {
    id, name, description, status,
    entry_type,
    tournament_count,
    participant_count,
    start_date, end_date,
    organizer: { display_name, avatar_url }
  }
]
```

---

### 15. シリーズ詳細 `/series/[id]`

**表示要素:**
- ヘッダー情報（タイトル、説明、期間）
- ポイントルール説明
- タブ
  - 概要
  - 含まれる大会一覧
  - ランキング
- アクションボタン
  - 個人戦: なし（各大会からエントリー）
  - チーム戦: 「チームを登録」（シリーズ単位での参加登録）

**必要データ:**
```
series: {
  id, name, description, status,
  entry_type, point_system,
  start_date, end_date,
  tournaments: [...],
  organizer: {...}
}
```

---

### 16. シリーズ作成 `/series/new`

**表示要素:**
- 基本情報
  - タイトル
  - 説明
  - 期間（開始日〜終了日）
- 参加形式
  - 個人戦 / チーム戦
- ポイント設定
  - ポイントシステム選択
    - 順位ポイント制（1位:○点、2位:○点...）
    - 勝利数カウント（1勝:○点）
  - カスタムポイント設定

**必要データ（入力）:**
```
{
  name, description,
  start_date, end_date,
  entry_type: 'individual' | 'team',
  point_system: 'ranking' | 'wins',
  point_config: {
    // ranking の場合
    ranking_points: { 1: 100, 2: 70, 3: 50, ... },
    // wins の場合
    points_per_win: 10
  }
}
```

---

### 17. シリーズ編集 `/series/[id]/edit`

**表示要素:**
- シリーズ作成と同様
- 大会追加・除外機能

---

### 18. シリーズランキング `/series/[id]/ranking`

**表示要素:**
- ランキングテーブル
  - 順位
  - プレイヤー名/チーム名
  - 累計ポイント
  - 参加大会数
  - 勝利数/敗北数
- 大会別ポイント内訳（展開表示）

**必要データ:**
```
ranking: [
  {
    rank,
    participant: { id, name, avatar_url },  // user or team
    total_points,
    tournaments_played,
    wins, losses,
    breakdown: [
      { tournament: { id, name }, points, placement }
    ]
  }
]
```

---

### 19. チーム一覧 `/teams`

**表示要素:**
- 検索バー
- チームカード一覧
  - チーム名 / アバター
  - メンバー数
  - リーダー名
  - 参加シリーズ数
- 「チームを作成」ボタン

**必要データ:**
```
teams: [
  {
    id, name, avatar_url,
    member_count,
    leader: { display_name },
    series_count
  }
]
```

---

### 20. チーム詳細 `/teams/[id]`

**表示要素:**
- チーム情報
  - 名前 / アバター
  - 説明
  - 作成日
- メンバー一覧
  - 表示名 / アバター
  - 役割（リーダー/メンバー）
  - 加入日
- 参加中のシリーズ/大会
- 戦績サマリー
- アクション
  - メンバー: 「チームを脱退」
  - リーダー: 「チームを編集」「メンバー管理」

**必要データ:**
```
team: {
  id, name, description, avatar_url,
  created_at,
  members: [
    { user: { id, display_name, avatar_url }, role, joined_at }
  ],
  active_series: [...],
  stats: { tournaments_played, wins, losses }
}
```

---

### 21. チーム作成 `/teams/new`

**表示要素:**
- チーム名入力
- アバターアップロード
- 説明入力
- 作成ボタン

**必要データ（入力）:**
```
{
  name, description, avatar_url
}
// 作成者が自動的にリーダーになる
```

---

### 22. チーム編集 `/teams/[id]/edit`

**表示要素:**
- チーム作成と同様のフォーム
- チーム解散ボタン（リーダーのみ）

---

### 23. メンバー管理 `/teams/[id]/members`

**表示要素:**
- 現在のメンバー一覧
  - 役割変更（リーダー委譲）
  - メンバー除外
- 招待機能
  - 招待リンク生成
  - 有効期限設定
- 招待中リスト
  - 招待取り消し

**必要データ:**
```
members: [...],
pending_invites: [
  { id, invite_token, expires_at, created_at }
]
```

---

### 24. 招待処理 `/teams/invite/[token]`

**表示要素:**
- チーム情報表示
- 招待内容確認
- 「参加する」ボタン
- 期限切れ/無効時のエラー表示

**必要データ:**
```
invite: {
  team: { id, name, avatar_url, member_count },
  expires_at,
  is_valid
}
```

---

### 25. マイページ `/mypage`

**表示要素:**
- プロフィールサマリー
- 統計
  - 参加大会数
  - 主催大会数
  - 所属チーム数
- クイックリンク
  - 参加中の大会
  - 主催中の大会
  - 所属チーム

---

### 26-29. その他ユーザー画面

（既存設計を維持、チーム関連リンク追加）

---

### 30. デッキマスタ管理 `/tournaments/[id]/decks`

**用途:** 大会/シリーズで使用するデッキリストを主催者が管理

**表示要素:**
- デッキ一覧テーブル
  - デッキ名（アーキタイプ名）
  - 使用者数（エントリー/対戦で選択された数）
  - 勝率
  - 並び替え・検索
- デッキ追加フォーム
  - デッキ名入力
  - 画像/アイコン設定（任意）
  - カテゴリ/タグ（任意）
- 一括操作
  - CSVインポート
  - テンプレートから追加（よく使うデッキセット）
  - 他大会からコピー

**必要データ:**
```
decks: [
  {
    id, name, icon_url,
    usage_count, win_count, loss_count,
    win_rate
  }
]
```

**権限:** 主催者のみ編集可能

---

### 31. 大会メタゲーム統計 `/tournaments/[id]/stats`

**用途:** 大会全体のデッキ分布・勝率を分析

**表示要素:**
- サマリーカード
  - 総対戦数
  - ユニークデッキ数
  - 最多使用デッキ
  - 最高勝率デッキ
- デッキ使用率チャート（円グラフ/棒グラフ）
- デッキティア表
  - Tier 1 / Tier 2 / Tier 3（勝率で自動分類）
  - デッキ名、使用率、勝率、対戦数
- マッチアップ表（デッキ相性）
  - デッキA vs デッキB の勝率マトリクス
- フィルター
  - ラウンド範囲（予選/本戦/決勝トーナメント）
  - 日付範囲（シリーズ内の場合）

**必要データ:**
```
stats: {
  total_matches, unique_decks,
  most_used: { deck, count, rate },
  highest_winrate: { deck, rate },
  deck_stats: [
    {
      deck: { id, name, icon_url },
      usage_count, usage_rate,
      wins, losses, win_rate,
      tier: 1 | 2 | 3
    }
  ],
  matchups: [
    { deck1_id, deck2_id, deck1_wins, deck2_wins, total }
  ]
}
```

---

### 32. シリーズメタゲーム統計 `/series/[id]/stats`

**用途:** シリーズ全体のメタゲーム推移を分析

**表示要素:**
- 大会メタゲーム統計と同様の内容
- 追加: メタゲーム推移グラフ
  - 大会ごとのデッキ使用率推移（折れ線）
  - 大会ごとの勝率推移
- 大会別比較表

**必要データ:**
```
series_stats: {
  ...stats,
  trend: [
    {
      tournament: { id, name, date },
      deck_usage: { deck_id: rate },
      deck_winrate: { deck_id: rate }
    }
  ]
}
```

---

### 33. チーム戦績詳細 `/teams/[id]/stats`

**用途:** チームの戦績・使用デッキ分析

**表示要素:**
- チーム戦績サマリー
  - 総対戦数（チーム戦/個人戦）
  - 勝率
  - 参加大会数
  - 最高順位
- メンバー別戦績
  - メンバー名
  - 対戦数、勝率
  - 主要使用デッキ
- 使用デッキ分布（チーム全体）
  - 円グラフ
  - デッキごとの勝率
- 対戦履歴
  - 日付、大会名、対戦相手、結果
  - 使用デッキ（両者）
- フィルター
  - 期間
  - 大会/シリーズ
  - メンバー

**必要データ:**
```
team_stats: {
  total_matches, wins, losses, win_rate,
  tournaments_played, best_placement,
  member_stats: [
    {
      user: { id, display_name },
      matches, wins, losses, win_rate,
      main_decks: [{ deck, count }]
    }
  ],
  deck_distribution: [
    { deck: { id, name }, count, win_rate }
  ],
  match_history: [
    {
      date, tournament: { id, name },
      opponent: { name },
      result: 'win' | 'lose',
      my_deck, opponent_deck,
      score
    }
  ]
}
```

---

### 34. 対戦カード生成 `/tournaments/[id]/share/match/[matchId]`

**用途:** 試合前の対戦カード画像をTwitter/Discordで共有

**表示要素:**
- プレビュー表示
  - 大会名・ロゴ
  - ラウンド情報（準決勝、決勝など）
  - プレイヤー1 vs プレイヤー2（名前・アバター）
  - チーム戦時: チーム名・出場メンバー一覧
  - 対戦形式（BO1/BO3）
- カスタマイズオプション
  - テンプレート選択（複数デザイン）
  - 背景色/画像
  - 大会ロゴ表示ON/OFF
- アクションボタン
  - 「画像をダウンロード」（PNG）
  - 「Twitterで共有」（画像付きツイート）
  - 「URLをコピー」（OGP対応URL）

**必要データ:**
```
match: {
  id, round_name, match_number,
  player1: { display_name, avatar_url, team_name? },
  player2: { display_name, avatar_url, team_name? },
  // チーム戦時
  team1: { name, roster: [...] },
  team2: { name, roster: [...] }
},
tournament: { id, title, logo_url }
```

**画像生成仕様:**
- サイズ: 1200x630px（OGP推奨サイズ）
- 形式: PNG
- 生成方法: サーバーサイドレンダリング（@vercel/og または satori）

---

### 31. 結果カード生成 `/tournaments/[id]/share/result/[matchId]`

**用途:** 試合後の結果画像をTwitter/Discordで共有

**表示要素:**
- プレビュー表示
  - 大会名・ロゴ
  - ラウンド情報
  - 勝者ハイライト表示
  - スコア表示（2-1など）
  - チーム戦時: 各メンバー戦の結果一覧
- カスタマイズオプション（対戦カードと同様）
- アクションボタン（対戦カードと同様）

**必要データ:**
```
match: {
  id, round_name, match_number,
  player1: { display_name, avatar_url, score },
  player2: { display_name, avatar_url, score },
  winner_id,
  // チーム戦時
  individual_results: [
    { player1, player2, score, winner_id }
  ]
},
tournament: { id, title, logo_url }
```

---

### 36. 大会結果サマリー `/tournaments/[id]/share/summary`

**用途:** 大会終了後の結果まとめ画像

**表示要素:**
- プレビュー表示
  - 大会名・ロゴ
  - 開催日
  - 参加者数
  - 上位入賞者（1位〜4位 or 8位）
    - 順位・名前・アバター
  - 決勝戦スコア
- カスタマイズオプション
  - 表示順位数（Top4/Top8）
  - テンプレート選択
- アクションボタン（同様）

**必要データ:**
```
tournament: {
  id, title, logo_url,
  start_at, participant_count,
  final_match: { player1, player2, score, winner_id }
},
standings: [
  { rank, player: { display_name, avatar_url } }
]
```

---

### 37. ラウンド対戦表 `/tournaments/[id]/share/round/[round]`

**用途:** 特定ラウンドの全対戦カードをまとめた画像

**表示要素:**
- プレビュー表示
  - 大会名
  - ラウンド名（Round 1、準々決勝など）
  - 全マッチのグリッド表示
    - 各マッチ: Player1 vs Player2
    - 結果入力済みの場合はスコア表示
- カスタマイズオプション
  - レイアウト（2列/4列）
  - 結果表示ON/OFF
- アクションボタン（同様）

**必要データ:**
```
tournament: { id, title },
round: {
  round_number, round_name,
  matches: [
    { player1, player2, score?, winner_id? }
  ]
}
```

---

### 38. メタゲーム統計画像 `/tournaments/[id]/share/meta`

**用途:** 大会/シリーズのメタゲーム統計を画像化してSNS共有

**表示要素:**
- プレビュー表示
  - 大会名・ロゴ
  - デッキ使用率Top5〜10（棒グラフまたはリスト）
  - 各デッキの勝率表示
  - ティア分類表示
- カスタマイズオプション
  - 表示デッキ数（Top5/Top10）
  - グラフ形式（棒/円）
  - 勝率表示ON/OFF
- アクションボタン（同様）

**必要データ:**
```
meta_image: {
  tournament: { id, title, logo_url, date },
  total_matches,
  deck_stats: [
    { deck: { name, icon_url }, usage_rate, win_rate, tier }
  ]
}
```

---

### 39. チーム戦績画像 `/teams/[id]/share/stats`

**用途:** チームの戦績・統計を画像化してSNS共有

**表示要素:**
- プレビュー表示
  - チーム名・アバター
  - 戦績サマリー（勝敗、勝率）
  - 主要使用デッキTop3
  - メンバー別勝率（オプション）
  - 最近の戦績（直近5戦など）
- カスタマイズオプション
  - 期間フィルター
  - メンバー詳細表示ON/OFF
  - 直近戦績の表示数
- アクションボタン（同様）

**必要データ:**
```
team_stats_image: {
  team: { id, name, avatar_url },
  total_matches, wins, losses, win_rate,
  main_decks: [
    { deck: { name, icon_url }, count, win_rate }
  ],
  member_highlights: [
    { user: { display_name }, win_rate }
  ],
  recent_matches: [
    { opponent, result, date }
  ]
}
```

---

### OGP API エンドポイント

SNS共有用のOGP画像を動的生成するAPIも必要:

```
GET /api/og/match/[matchId]                → 対戦カード画像
GET /api/og/result/[matchId]               → 結果カード画像
GET /api/og/summary/[tournamentId]         → 大会サマリー画像
GET /api/og/round/[tournamentId]/[round]   → ラウンド対戦表画像
GET /api/og/meta/[tournamentId]            → メタゲーム統計画像
GET /api/og/team-stats/[teamId]            → チーム戦績画像
```

これらのURLをTwitter/Discordに貼るとプレビュー画像が表示される。

---

## DB要件サマリー

### テーブル候補

| テーブル | 説明 | Phase |
|----------|------|-------|
| users | ユーザー情報 | 1 |
| tournaments | 大会情報 | 1 |
| participants | 大会参加者（個人戦用） | 1 |
| matches | 対戦情報 | 1 |
| match_reports | 結果報告 | 2 |
| **series** | シリーズ（長期大会）情報 | 1 |
| **series_points** | シリーズポイント記録 | 1 |
| **teams** | チーム情報 | 1 |
| **team_members** | チームメンバー | 1 |
| **team_invites** | チーム招待 | 1 |
| **team_entries** | チーム戦エントリー | 1 |
| **team_rosters** | 出場メンバー・順番 | 1 |
| **individual_matches** | チーム戦内の個人戦 | 1 |
| **decks** | デッキマスタ（大会/シリーズ単位） | 1 |
| **match_decks** | 対戦で使用したデッキ記録 | 1 |
| **participant_decks** | エントリー時のデッキ登録 | 1 |
| custom_fields | カスタム項目 | 2 |
| custom_answers | カスタム回答 | 2 |
| notifications | 通知 | 1 |

### 主要リレーション

```
# 基本
users 1--* tournaments (organizer)
users 1--* participants
tournaments 1--* participants
tournaments 1--* matches

# シリーズ
series 1--* tournaments
series 1--* series_points
series_points *--1 users | teams

# チーム
teams 1--* team_members
team_members *--1 users
teams 1--* team_invites
teams 1--* team_entries
team_entries 1--* team_rosters
team_rosters *--1 users

# チーム戦
tournaments 1--* team_entries
matches 1--* individual_matches (チーム戦時)

# デッキ・統計
tournaments | series 1--* decks
participants 1--* participant_decks
matches 1--* match_decks
match_decks *--1 decks
match_decks *--1 users (player)
```

### エンティティ概要

```
series {
  id, name, description,
  organizer_id,
  entry_type: 'individual' | 'team',
  point_system: 'ranking' | 'wins',
  point_config: jsonb,
  start_date, end_date,
  status
}

teams {
  id, name, description, avatar_url,
  leader_id,
  created_at
}

team_members {
  id, team_id, user_id,
  role: 'leader' | 'member',
  joined_at
}

tournaments (追加カラム) {
  ...
  series_id: uuid | null,
  entry_type: 'individual' | 'team',
  team_battle_format: 'knockout' | 'point' | null,
  team_size_min, team_size_max,
  team_creation_mode: 'user' | 'organizer'
}

team_entries {
  id, tournament_id, team_id,
  check_in_status,
  created_at
}

team_rosters {
  id, team_entry_id, user_id,
  order,  // 出場順（勝ち抜き戦用）
}

individual_matches {
  id, match_id,  // 親のチーム対戦
  order,
  player1_id, player2_id,
  player1_score, player2_score,
  winner_id, status
}

decks {
  id,
  tournament_id: uuid | null,  // 大会単位の場合
  series_id: uuid | null,      // シリーズ単位の場合
  name,                        // アーキタイプ名
  icon_url,
  category,                    // 任意のカテゴリ/タグ
  created_at
}

participant_decks {
  id, participant_id,
  deck_id,
  registered_at               // エントリー時登録
}

match_decks {
  id, match_id,
  user_id,                    // 使用プレイヤー
  deck_id,
  is_winner: boolean
}

tournaments (追加カラム - デッキ関連) {
  ...
  deck_registration_mode: 'none' | 'entry' | 'per_match' | 'both'
}
```

### Realtime要件

- matches / individual_matches の変更
- participants / team_entries の変更（チェックイン）
- series_points の変更（ランキング更新）
- notifications の変更
