# Katorin2 UIリデザイン

## 概要

- **目的**: 「物を置いているだけ」の現状UIを、Tonamel/start.ggレベルの直感的で情報密度の高いUIに改修
- **スコープ**: ナビゲーション、一覧ページ、詳細ページ、共通コンポーネント
- **対象外**: 管理者フォーム（AdminOrderForm等）、認証ページ（login/register）
- **前提条件・制約**:
  - shadcn/ui + Tailwind CSS（既存スタック維持）
  - lucide-react（既にインストール済み、活用を拡大）
  - Supabase Storage（tournament-covers バケット既存）
  - `cover_image_url` カラムは series / tournaments 両テーブルに既存（DBマイグレーション不要）
  - モバイルファースト（遊戯王MDプレイヤーはスマホメイン）
  - next-intl による i18n 対応（ja/en）。新規コンポーネントの表示テキストは翻訳キーを使用

## 要件

### 機能要件

1. **ボトムナビゲーション**（モバイル）
   - 大会一覧 / シリーズ / チーム / マイページ の4タブ
   - lucide-reactアイコン: Trophy, Layers, Users, User
   - 現在のページをハイライト（primary色）
   - デスクトップ(md以上)では非表示、従来のヘッダーナビ維持
   - 未認証時: マイページタブ → ログインページへ遷移

2. **バナー画像**
   - シリーズ・大会にカバー画像を設定可能
   - 主催者がアップロード（既存のSupabase Storage活用）
   - デフォルト画像を数種類用意（遊戯王MDテーマ）
   - アスペクト比: 16:9（Tonamel準拠）
   - 一覧でのサムネイル表示 + 詳細ページでのヒーローバナー

3. **一覧ページ改修**
   - リスト+サムネイル形式（左にサムネ、右にテキスト情報）
   - ピックアップ（in_progress等）はカードグリッドで目立たせる
   - 絵文字→lucide-reactアイコンに統一

4. **詳細ページ改修**
   - ヒーローバナー（カバー画像を大きく表示）
   - 統計カードにアイコン付与
   - チーム一覧にアバター表示
   - 順位表のモバイル最適化（列の出し分け）

5. **アイコン・視覚要素の統一**
   - ステータス表示: 絵文字→lucide-reactアイコン+カラードット
   - ナビゲーション: lucide-reactアイコン
   - メタ情報: アイコン+テキストの統一パターン

### 非機能要件

- Core Web Vitals に影響しない（画像はlazy load、適切なサイズ）
- アクセシビリティ: アイコンにaria-label、タッチターゲット44px以上

## 設計

### コンポーネント構成

```
src/components/
├── layout/
│   ├── Header.tsx          # 既存改修（デスクトップナビ維持）
│   ├── BottomNav.tsx       # 新規: モバイルボトムナビ
│   └── PageHeader.tsx      # 新規: ページタイトル+アクション統一
├── common/
│   ├── StatusIndicator.tsx # 新規: アイコン+ドット+ラベルの統一表示
│   ├── BannerImage.tsx     # 新規: バナー画像（fallback付き）
│   ├── MetaItem.tsx        # 新規: アイコン+テキストの情報表示
│   └── EmptyState.tsx      # 新規: 空状態の統一表示
├── series/
│   ├── SeriesListItem.tsx  # 改修: サムネ+アイコン化
│   └── SeriesCard.tsx      # 新規: ピックアップ用カード
├── tournament/
│   ├── TournamentListItem.tsx # 改修: サムネ+アイコン化
│   └── TournamentCard.tsx     # 既存改修: ピックアップ用
```

### レイアウト構造

```
(main)/layout.tsx
├── Header          # md以上で表示
├── main            # pb-16 md:pb-0（ボトムナビ分の余白）
│   └── {children}
└── BottomNav       # md未満で表示
```

### ボトムナビ仕様

```
┌─────────┬─────────┬─────────┬─────────┐
│  🏆     │  📋     │  👥     │  👤     │
│ 大会    │ シリーズ │ チーム  │ マイページ│
└─────────┴─────────┴─────────┴─────────┘
```

- lucide-reactアイコン: Trophy, Layers, Users, User
- 現在ページ: primary色
- 他: muted-foreground
- 未認証時: マイページ→ログインへ遷移
- safe-area-inset-bottom 対応（iOS Safari）
- 高さ: h-16 + pb-safe

### 一覧ページ構造

```
┌──────────────────────────────┐
│ ページタイトル    [作成ボタン] │  ← PageHeader
├──────────────────────────────┤
│ 検索バー + フィルター         │
├──────────────────────────────┤
│ ── ピックアップ（進行中）──   │
│ ┌──────┐ ┌──────┐            │  ← カードグリッド
│ │banner│ │banner│            │
│ │title │ │title │            │
│ │meta  │ │meta  │            │
│ └──────┘ └──────┘            │
├──────────────────────────────┤
│ ── すべて ──                 │
│ ┌────┬───────────────────┐   │  ← リスト+サムネイル
│ │thumb│ Title    [status]│   │
│ │    │ meta info         │   │
│ └────┴───────────────────┘   │
│ ┌────┬───────────────────┐   │
│ │thumb│ Title    [status]│   │
│ │    │ meta info         │   │
│ └────┴───────────────────┘   │
└──────────────────────────────┘
```

### 詳細ページ構造

```
┌──────────────────────────────┐
│ ◀ パンくず                   │
├──────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← ヒーローバナー(16:9)
│▓▓▓▓▓▓▓ COVER IMAGE ▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├──────────────────────────────┤
│ タイトル [status] [type]     │
│ 👤 主催者名                  │
│                 [編集][追加] │
├──────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐  │  ← 統計カード(アイコン付き)
│ │🏆 2  │ │👥 16 │ │📊進行│  │
│ │大会数│ │チーム│ │状態  │  │
│ └──────┘ └──────┘ └──────┘  │
├──────────────────────────────┤
│ [順位表] [チーム] [大会] ... │  ← タブ（横スクロール対応）
├──────────────────────────────┤
│ タブコンテンツ               │
└──────────────────────────────┘
```

### バナー画像仕様

- アスペクト比: 16:9
- 最大ファイルサイズ: 5MB
- 推奨サイズ: 1200x675px
- サムネイル: 一覧で120x68px（object-cover）
- ヒーロー: 詳細ページで全幅表示（max-h-48 md:max-h-64）
- デフォルト画像: 5〜8種類（遊戯王MDのテーマカラーベース）
  - 青系（水属性）、赤系（炎属性）、緑系（風属性）、
    紫系（闇属性）、黄系（光属性）、灰系（岩石族）、
    グラデーション系
- Supabase Storage `tournament-covers` バケット使用（series/tournaments共用）

### アイコン・ステータス設計

| ステータス | アイコン(lucide) | カラー | 用途 |
|-----------|-----------------|--------|------|
| draft | FileEdit | gray-400 | 下書き |
| registration/recruiting | UserPlus | blue-500 | 募集中 |
| in_progress | Play | green-500 | 進行中 |
| completed | CheckCircle | gray-600 | 完了 |
| cancelled | XCircle | red-500 | 中止 |

| メタ情報 | アイコン(lucide) |
|---------|-----------------|
| 参加者数 | Users |
| 大会数 | Trophy |
| 開催日 | Calendar |
| 形式 | LayoutGrid |
| 主催者 | User |
| ラウンド | Repeat |

### 順位表モバイル最適化

```
デスクトップ: # | チーム | 試合 | 勝 | 負 | 勝点 | R差 | M差
モバイル:     # | チーム | 勝 | 負 | 勝点
```

- R差, M差: `hidden md:table-cell`
- 試合数: `hidden sm:table-cell`

## タスク分解

### Phase 1: 基盤コンポーネント
- [ ] BottomNav.tsx 新規作成（lucide-reactアイコン、usePathname でハイライト、safe-area対応）
- [ ] (main)/layout.tsx にボトムナビ統合 + main要素のpb-16 md:pb-0
- [ ] Header.tsx モバイルナビ削除（ボトムナビに委譲）、デスクトップナビはlucide-reactアイコン追加
- [ ] StatusIndicator.tsx 新規作成（lucide-react統一、ステータス→アイコン+色のマッピング）
- [ ] MetaItem.tsx 新規作成（アイコン+テキストの統一表示）
- [ ] PageHeader.tsx 新規作成（タイトル+アクションボタンのレスポンシブ配置）
- [ ] EmptyState.tsx 新規作成（アイコン+メッセージの空状態表示）
- [ ] BannerImage.tsx 新規作成（next/image、fallbackデフォルト画像、16:9アスペクト比）
- [ ] デフォルトバナー画像をCSSグラデーションで生成（public/defaults/に配置、5種）
- [ ] i18n: 新規コンポーネント用の翻訳キー追加（messages/ja.json, messages/en.json）

### Phase 2: 一覧ページ改修
- [ ] SeriesListItem.tsx 改修（サムネ+StatusIndicator+MetaItem化）
- [ ] SeriesCard.tsx 新規作成（ピックアップ用カード、バナー画像表示）
- [ ] series/page.tsx 改修（ピックアップ+リスト構成、PageHeader使用）
- [ ] TournamentListItem.tsx 改修（サムネ+StatusIndicator+MetaItem化）
- [ ] TournamentCard.tsx 既存改修（ピックアップ用、バナー画像表示）
- [ ] tournaments/page.tsx 改修（ピックアップ+リスト構成、PageHeader使用）

### Phase 3: 詳細ページ改修
- [ ] series/[id]/page.tsx 改修（ヒーローバナー、統計カードにアイコン、タブ横スクロール）
- [ ] tournaments/[id]/page.tsx 改修（ヒーローバナー、情報整理、MetaItem統一）
- [ ] tournaments/[id]/wars/[matchId]/page.tsx 改修（スコアカード視認性向上、MetaItem統一）
- [ ] 順位表のモバイル列出し分け（hidden sm:/md: パターン）
- [ ] チーム一覧にアバター表示追加（既存avatar_urlがあれば画像、なければ文字アバター）

### Phase 4: 画像アップロード対応
- [ ] シリーズ作成/編集フォーム（SeriesForm.tsx）にカバー画像アップロード追加
- [ ] 大会作成/編集フォーム（TournamentForm.tsx）にカバー画像アップロード追加
- [ ] 既存のimage-upload.tsxコンポーネントとuploadTournamentCover()を活用

## リスク・懸念事項

- **デフォルトバナー画像の著作権**: 遊戯王の素材は使用不可。CSSグラデーション画像で対応（著作権リスクゼロ）
- **画像サイズによるパフォーマンス**: next/image で最適化 + lazy load + priority指定（ヒーローバナーのみ）
- **ボトムナビの高さ分**: iOS Safari の safe-area-inset-bottom 対応（env(safe-area-inset-bottom) 使用）
- **既存テストへの影響**: UIコンポーネント変更のみでロジック変更なし。テストスクリプトには影響しない

## 未決事項

- タブの横スクロール実装: shadcn/ui の TabsList に overflow-x-auto を追加する方式で仮置き
