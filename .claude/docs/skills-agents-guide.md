# Claude Code スキル・エージェント・サブエージェント ガイド

## 目次

1. [概要](#概要)
2. [スキル (Skills)](#スキル-skills)
3. [サブエージェント (Subagents)](#サブエージェント-subagents)
4. [スラッシュコマンド (Slash Commands)](#スラッシュコマンド-slash-commands)
5. [使い分けガイド](#使い分けガイド)
6. [推奨リソース](#推奨リソース)

---

## 概要

Claude Codeには、機能を拡張するための複数の仕組みがあります：

| 機能 | 説明 | 実行タイミング |
|------|------|--------------|
| **スキル** | Claudeに専門知識を付与 | Claudeが関連性を判断して自動適用 |
| **スラッシュコマンド** | 再利用可能なプロンプト | `/command`で明示的に実行 |
| **CLAUDE.md** | プロジェクト全体の指示 | すべての会話で自動読み込み |
| **サブエージェント** | 隔離されたコンテキストで委任 | Claudeが委任または手動呼び出し |
| **フック** | イベント発火時にスクリプト実行 | 特定イベント発生時 |
| **MCPサーバー** | 外部ツールとの連携 | Claudeが必要に応じて呼び出し |

---

## スキル (Skills)

### スキルとは

スキルは、Claudeに特定の能力を教えるMarkdownファイルです。Claudeはリクエストに基づいて自動的に適切なスキルを選択・適用します。

### 基本構造

```
my-skill/
├── SKILL.md              # 必須 - 概要とナビゲーション
├── reference.md          # 詳細ドキュメント（必要時に読み込み）
├── examples.md           # 使用例（必要時に読み込み）
└── scripts/
    └── helper.py         # ユーティリティスクリプト
```

### SKILL.md の書き方

```yaml
---
name: my-skill-name
description: スキルの説明。いつ使うかを明記する。
allowed-tools: Read, Grep, Glob  # オプション: 使用可能ツールを制限
model: sonnet                     # オプション: 使用モデルを指定
context: fork                     # オプション: 隔離コンテキストで実行
user-invocable: true             # オプション: /コマンドメニューに表示
---

# スキルの指示内容

ここにClaude向けの詳細な指示を記述します。
```

### メタデータフィールド

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | はい | 小文字、数字、ハイフンのみ（最大64文字） |
| `description` | はい | 機能と使用タイミング（最大1024文字） |
| `allowed-tools` | いいえ | 使用可能ツールを制限 |
| `model` | いいえ | 使用モデル（sonnet, opus, haiku） |
| `context` | いいえ | `fork`で隔離コンテキスト実行 |
| `agent` | いいえ | `context: fork`時のエージェント種類 |
| `hooks` | いいえ | ライフサイクルフック |
| `user-invocable` | いいえ | スラッシュコマンドメニュー表示（デフォルト: true） |

### 保存場所と優先順位

| 場所 | パス | 適用範囲 |
|------|------|----------|
| エンタープライズ | 管理設定参照 | 組織全員 |
| 個人 | `~/.claude/skills/` | 自分（全プロジェクト） |
| プロジェクト | `.claude/skills/` | リポジトリの全員 |
| プラグイン | プラグイン同梱 | プラグイン使用者 |

**優先順位**: 管理 > 個人 > プロジェクト > プラグイン

### ベストプラクティス

1. **SKILL.mdは500行以下**に保つ（パフォーマンス最適化）
2. **段階的開示**: 必須情報はSKILL.md、詳細は別ファイル
3. **具体的なキーワード**を説明に含める（ユーザーが自然に使う言葉）
4. **allowed-tools**で必要に応じて機能を制限

---

## サブエージェント (Subagents)

### サブエージェントとは

サブエージェントは、隔離されたコンテキストウィンドウで特定タスクを処理する専門AIアシスタントです。

### メリット

- **コンテキスト保持**: 探索と実装を分離
- **制約の強制**: ツールアクセスを制限
- **設定の再利用**: ユーザーレベルで全プロジェクト共通
- **動作の特化**: 集中したシステムプロンプト
- **コスト管理**: Haikuなど高速モデルへルーティング

### 基本構造

```yaml
---
name: code-reviewer
description: コード品質とベストプラクティスをレビュー
tools: Read, Grep, Glob, Bash
model: sonnet
permissionMode: default
---

あなたはコードレビューアーです。呼び出されたら、
コードを分析し、品質、セキュリティ、ベストプラクティスについて
具体的で実行可能なフィードバックを提供してください。
```

### 設定フィールド

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | はい | 一意の識別子（小文字、ハイフン） |
| `description` | はい | いつ委任すべきかの説明 |
| `tools` | いいえ | 許可ツール（省略時は全て継承） |
| `disallowedTools` | いいえ | 拒否ツール |
| `model` | いいえ | `sonnet`, `opus`, `haiku`, `inherit` |
| `permissionMode` | いいえ | 権限モード |
| `skills` | いいえ | 読み込むスキル |
| `hooks` | いいえ | ライフサイクルフック |

### 権限モード

| モード | 動作 |
|--------|------|
| `default` | 標準の権限チェック（プロンプト表示） |
| `acceptEdits` | ファイル編集を自動承認 |
| `dontAsk` | 権限プロンプトを自動拒否 |
| `bypassPermissions` | 全ての権限チェックをスキップ（要注意） |
| `plan` | 読み取り専用の探索モード |

### 推奨ツールセット

| 用途 | ツール |
|------|--------|
| 読み取り専用 | Read, Grep, Glob, Bash |
| フルアクセス | 全ツール継承 |
| 書き込み操作 | Read, Grep, Glob, Edit, Write |

### 保存場所

| 優先度 | 場所 | パス |
|--------|------|------|
| 1（最高） | セッション | `--agents` CLIフラグ |
| 2 | プロジェクト | `.claude/agents/` |
| 3 | ユーザー | `~/.claude/agents/` |
| 4（最低） | プラグイン | プラグイン内`agents/` |

### 使用パターン

**高出力操作の隔離**:
```
サブエージェントを使ってテストスイートを実行し、失敗テストのみ報告して
```

**並列リサーチ**:
```
認証、データベース、APIモジュールを別々のサブエージェントで並列調査して
```

**チェーン実行**:
```
code-reviewerで問題を見つけて、その後optimizerで修正して
```

### 重要な制限

- サブエージェントは他のサブエージェントを生成できない
- ネストされたワークフローにはスキルを使用するか、メイン会話からチェーン

---

## スラッシュコマンド (Slash Commands)

### スラッシュコマンドとは

頻繁に使用するプロンプトをMarkdownファイルとして定義し、`/command`で実行できる機能です。

### 保存場所

- **プロジェクト**: `.claude/commands/` - 現在のプロジェクトのみ
- **個人**: `~/.claude/commands/` - 全プロジェクトで使用可能

### 基本的な作成方法

```bash
# プロジェクト固有コマンド
mkdir -p .claude/commands
echo "このコードのパフォーマンス問題を分析し、最適化を提案してください:" > .claude/commands/optimize.md

# 個人用コマンド
mkdir -p ~/.claude/commands
echo "このコードのセキュリティ脆弱性をレビューしてください:" > ~/.claude/commands/security.md
```

### メタデータ付きコマンド

```yaml
---
argument-hint: [pr-number] [priority] [assignee]
description: Pull Requestをレビュー
---
PR #$1 を優先度 $2 でレビューし、$3 にアサインしてください。
```

### スキルとの違い

| スラッシュコマンド | スキル |
|------------------|--------|
| `/...`で明示的に実行 | Claudeが自動判断で適用 |
| 単一ファイル | ディレクトリ構造（スクリプト含む） |
| ターミナル補完対応 | 自然言語で呼び出し |

---

## 使い分けガイド

### いつ何を使うか

| 状況 | 推奨機能 |
|------|----------|
| 短く、常に適用するルール | CLAUDE.md |
| 明示的に実行したいプロンプト | スラッシュコマンド |
| Claudeに自動適用してほしい専門知識 | スキル |
| 隔離コンテキストでの委任タスク | サブエージェント |
| イベント駆動の自動処理 | フック |
| 外部サービス連携 | MCPサーバー |

### サブエージェント vs メイン会話

**サブエージェントを使う場合**:
- タスクが冗長な出力を生成し、メインコンテキストに不要
- 特定のツール制限や権限を強制したい
- 作業が自己完結的で、要約を返せる

**メイン会話を使う場合**:
- 頻繁なやり取りと改善が必要
- 複数フェーズが重要なコンテキストを共有
- 迅速で的を絞った変更を行う

---

## 推奨リソース

### 公式ドキュメント

- [Agent Skills](https://code.claude.com/docs/en/skills) - スキル公式ドキュメント
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents) - サブエージェント公式ドキュメント
- [Slash commands](https://code.claude.com/docs/en/slash-commands) - スラッシュコマンド公式ドキュメント

### コミュニティリソース

- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) - スキル、フック、コマンドのキュレーションリスト
- [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) - 100以上の専門サブエージェント
- [commands](https://github.com/wshobson/commands) - プロダクション向けスラッシュコマンド集
- [claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts) - Claude Codeシステムプロンプト集

### ベストプラクティス記事

- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices) - Anthropic公式
- [Claude Code customization guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) - カスタマイズガイド
