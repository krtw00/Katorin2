# 推奨スキル・サブエージェント・コマンド一覧

## 目次

1. [サブエージェント（100種以上）](#サブエージェント)
2. [スキル](#スキル)
3. [フック](#フック)
4. [スラッシュコマンド](#スラッシュコマンド)
5. [ツール・ユーティリティ](#ツール・ユーティリティ)
6. [ワークフロー・ナレッジガイド](#ワークフロー・ナレッジガイド)

---

## サブエージェント

**ソース**: [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)

### 1. コア開発 (voltagent-core-dev)

| エージェント | 説明 |
|-------------|------|
| `api-designer` | REST/GraphQL APIアーキテクト |
| `backend-developer` | サーバーサイド・スケーラブルAPI専門 |
| `electron-pro` | デスクトップアプリケーション専門 |
| `frontend-developer` | React/Vue/Angular UI/UX開発 |
| `fullstack-developer` | エンドツーエンド機能開発 |
| `graphql-architect` | スキーマ・フェデレーション専門 |
| `microservices-architect` | 分散システム設計 |
| `mobile-developer` | クロスプラットフォームモバイル |
| `ui-designer` | ビジュアルデザイン・インタラクション |
| `websocket-engineer` | リアルタイム通信専門 |
| `wordpress-master` | WordPress開発 |

### 2. 言語スペシャリスト (voltagent-lang)

| 言語/フレームワーク |
|-------------------|
| TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin |
| C++, C#, Swift, Elixir, PHP, PowerShell |
| React, Vue, Angular, Next.js, Django, Laravel, Rails |
| .NET Core/Framework, Flutter |

### 3. インフラストラクチャ (voltagent-infra)

| エージェント | 説明 |
|-------------|------|
| `azure-infra-engineer` | Azure・PowerShell自動化 |
| `cloud-architect` | AWS/GCP/Azure専門 |
| `database-administrator` | データベース管理 |
| `deployment-engineer` | デプロイ自動化 |
| `devops-engineer` | CI/CD・自動化 |
| `devops-incident-responder` | インシデント管理 |
| `kubernetes-specialist` | コンテナオーケストレーション |
| `network-engineer` | ネットワークインフラ |
| `platform-engineer` | プラットフォームアーキテクチャ |
| `security-engineer` | インフラセキュリティ |
| `sre-engineer` | サイト信頼性エンジニアリング |
| `terraform-engineer` | Infrastructure as Code |
| `windows-infra-admin` | AD/DNS/DHCP/GPO自動化 |

### 4. 品質・セキュリティ (voltagent-qa-sec)

| エージェント | 説明 |
|-------------|------|
| `accessibility-tester` | アクセシビリティテスト |
| `ad-security-reviewer` | ADセキュリティレビュー |
| `architect-reviewer` | アーキテクチャレビュー |
| `chaos-engineer` | カオスエンジニアリング |
| `code-reviewer` | コードレビュー |
| `compliance-auditor` | コンプライアンス監査 |
| `debugger` | デバッグ専門 |
| `error-detective` | エラー調査 |
| `penetration-tester` | ペネトレーションテスト |
| `performance-engineer` | パフォーマンスエンジニアリング |
| `qa-expert` | 品質保証 |
| `security-auditor` | セキュリティ監査 |
| `test-automator` | テスト自動化 |

### 5. データ・AI (voltagent-data-ai)

| エージェント | 説明 |
|-------------|------|
| `ai-engineer` | AIエンジニアリング |
| `data-analyst` | データ分析 |
| `data-engineer` | データエンジニアリング |
| `data-scientist` | データサイエンス |
| `database-optimizer` | データベース最適化 |
| `llm-architect` | LLMアーキテクチャ |
| `machine-learning-engineer` | 機械学習エンジニアリング |
| `mlops-engineer` | MLOps |
| `nlp-engineer` | 自然言語処理 |
| `postgres-pro` | PostgreSQL専門 |
| `prompt-engineer` | プロンプトエンジニアリング |

### 6. 開発者体験 (voltagent-dev-exp)

| エージェント | 説明 |
|-------------|------|
| `build-engineer` | ビルドエンジニアリング |
| `cli-developer` | CLI開発 |
| `dependency-manager` | 依存関係管理 |
| `documentation-engineer` | ドキュメンテーション |
| `dx-optimizer` | 開発者体験最適化 |
| `git-workflow-manager` | Gitワークフロー管理 |
| `legacy-modernizer` | レガシー近代化 |
| `mcp-developer` | MCP開発 |
| `refactoring-specialist` | リファクタリング |
| `tooling-engineer` | ツーリング |

### 7. 専門ドメイン (voltagent-domains)

| エージェント | 説明 |
|-------------|------|
| `blockchain` | ブロックチェーン |
| `embedded-systems` | 組み込みシステム |
| `fintech` | フィンテック |
| `game-dev` | ゲーム開発 |
| `iot` | IoT |
| `m365-admin` | Microsoft 365管理 |
| `payment-integration` | 決済統合 |
| `quant-analyst` | クオンツ分析 |
| `risk-management` | リスク管理 |

### 8. ビジネス・プロダクト (voltagent-biz)

| エージェント | 説明 |
|-------------|------|
| `business-analyst` | ビジネスアナリスト |
| `content-marketer` | コンテンツマーケティング |
| `customer-success-manager` | カスタマーサクセス |
| `legal-advisor` | リーガルアドバイザー |
| `product-manager` | プロダクトマネージャー |
| `project-manager` | プロジェクトマネージャー |
| `sales-engineer` | セールスエンジニア |
| `scrum-master` | スクラムマスター |
| `technical-writer` | テクニカルライター |
| `ux-researcher` | UXリサーチャー |

### 9. メタ・オーケストレーション (voltagent-meta)

| エージェント | 説明 |
|-------------|------|
| `agent-installer` | エージェントインストーラー |
| `agent-organizer` | エージェント整理 |
| `context-manager` | コンテキスト管理 |
| `error-coordinator` | エラー調整 |
| `it-ops-orchestrator` | IT運用オーケストレーション |
| `knowledge-synthesizer` | 知識統合 |
| `multi-agent-coordinator` | マルチエージェント調整 |
| `performance-monitor` | パフォーマンス監視 |
| `task-distributor` | タスク分配 |
| `workflow-orchestrator` | ワークフローオーケストレーション |

### 10. リサーチ・分析 (voltagent-research)

| エージェント | 説明 |
|-------------|------|
| `research-analyst` | リサーチアナリスト |
| `search-specialist` | 検索スペシャリスト |
| `trend-analyst` | トレンドアナリスト |
| `competitive-analyst` | 競合分析 |
| `market-researcher` | マーケットリサーチ |
| `data-researcher` | データリサーチ |

---

## スキル

**ソース**: [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

| スキル | 説明 |
|--------|------|
| **Claude Codex Settings** | クラウドプラットフォーム・人気サービス向けの整理されたプラグイン集 |
| **Claude Mountaineering Skills** | 10以上の登山ソースからルート情報を集約 |
| **Codex Skill** | Claude CodeからCodexをプロンプト（パラメータ推論・セッション継続対応） |
| **Context Engineering Kit** | 最小トークンフットプリントの高度コンテキストエンジニアリング技術集 |
| **Superpowers** | 計画・レビュー・テスト・デバッグを網羅した包括バンドル |
| **TÂCHES Claude Code Resources** | バランスの取れたサブエージェント・スキル集（メタスキル重視） |
| **Web Assets Generator Skill** | favicon、PWAアイコン、SNSメタ画像生成 |

---

## フック

| フック | 説明 |
|--------|------|
| **Britfix** | 米英語をイギリス英語に変換（コード識別子は保持） |
| **CC Notify** | デスクトップ通知とVS Codeワンクリックジャンプ |
| **cchooks** | 軽量Python SDK（フック作成簡略化） |
| **Claude Code Hook Comms (HCOM)** | サブエージェント間のリアルタイム通信 |
| **claude-code-hooks-sdk** | Laravel風PHP SDK（Fluent API） |
| **claude-hooks** | TypeScriptベースのフック設定システム |
| **Claudio** | OSネイティブサウンドをClaude Codeに追加 |
| **TDD Guard** | TDD原則違反をブロックするフック駆動システム |
| **TypeScript Quality Hooks** | Node.js TypeScriptプロジェクト品質チェック |

---

## スラッシュコマンド

**ソース**: [wshobson/commands](https://github.com/wshobson/commands)

### ワークフローコマンド（15種）

| コマンド | 説明 |
|---------|------|
| `/feature-development` | エンドツーエンド機能実装（バックエンド・フロント・テスト・デプロイ調整） |
| `/full-review` | 多角的コード分析（アーキテクチャ・セキュリティ・パフォーマンス・品質） |
| `/smart-fix` | 動的エージェント選択によるインテリジェント問題解決 |
| `/tdd-cycle` | テスト駆動開発オーケストレーション |
| `/git-workflow` | バージョン管理自動化 |
| `/improve-agent` | エージェント最適化・プロンプトエンジニアリング |
| `/legacy-modernize` | コードベース近代化・アーキテクチャ移行 |
| `/multi-platform` | クロスプラットフォーム開発調整 |
| `/workflow-automate` | CI/CDパイプライン自動化 |
| `/full-stack-feature` | マルチティア実装 |
| `/security-hardening` | セキュリティファースト開発・脅威モデリング |
| `/data-driven-feature` | ML駆動機能 |
| `/performance-optimization` | システム全体最適化 |
| `/incident-response` | 本番問題解決 |

### ツールコマンド（42種）

**AI・機械学習 (4)**
- `ai-assistant`, `ai-review`, `langchain-agent`, `prompt-optimize`

**エージェント連携 (3)**
- `multi-agent-review`, `multi-agent-optimize`, `smart-debug`

**アーキテクチャ・コード品質 (4)**
- `code-explain`, `code-migrate`, `refactor-clean`, `tech-debt`

**データ・データベース (3)**
- `data-pipeline`, `data-validation`, `db-migrate`

**DevOps・インフラ (5)**
- `deploy-checklist`, `docker-optimize`, `k8s-manifest`, `monitor-setup`, `slo-implement`

**テスト・開発 (6)**
- `api-mock`, `api-scaffold`, `test-harness`, `tdd-red`, `tdd-green`, `tdd-refactor`

**セキュリティ・コンプライアンス (3)**
- `accessibility-audit`, `compliance-check`, `security-scan`

**デバッグ・分析 (4)**
- `debug-trace`, `error-analysis`, `error-trace`, `issue`

**依存関係管理 (3)**
- `config-validate`, `deps-audit`, `deps-upgrade`

**ドキュメント・コラボレーション (3)**
- `doc-generate`, `pr-enhance`, `standup-notes`

**運用・コンテキスト (4)**
- `cost-optimize`, `onboard`, `context-save`, `context-restore`

---

## ツール・ユーティリティ

### セッション管理

| ツール | 説明 |
|--------|------|
| **cc-sessions** | Claude Code生産的開発のオピニオネーテッドアプローチ |
| **cchistory** | シェル履歴風コマンド（実行済みBashコマンド一覧） |
| **cclogviewer** | .jsonl会話ファイルをHTML UIで表示 |
| **recall** | Claude Codeセッションの全文検索（対話型ターミナルUI） |
| **claude-code-tools** | セッション継続性（全文検索・安全フック） |

### 使用量モニター

| ツール | 説明 |
|--------|------|
| **CC Usage** | 使用量管理・分析CLI（コストダッシュボード） |
| **ccflare** | Web UI使用量ダッシュボード |
| **better-ccflare** | ccflareの機能強化フォーク |
| **Claude Code Usage Monitor** | リアルタイムターミナルトークン使用量監視 |
| **Claudex** | 会話履歴ブラウザ（全文検索インデックス） |
| **viberank** | コミュニティ駆動の使用量統計リーダーボード |

### オーケストレーター

| ツール | 説明 |
|--------|------|
| **Claude Code Flow** | コードファーストオーケストレーション（自律的な書き込み・編集・テスト・最適化） |
| **Claude Squad** | 複数Claude Codeインスタンスを別ワークスペースで同時管理 |
| **Claude Swarm** | Claude Codeエージェントのスワームに接続 |
| **Claude Task Master** | AIドリブン開発のタスク管理システム |
| **Claude Task Runner** | コンテキスト分離・集中タスク実行管理 |
| **Happy Coder** | 携帯・デスクトップから複数Claude Codeを並列起動・制御 |
| **TSK** | Rust CLI（Dockerサンドボックス環境でAIエージェントにタスク委任） |

### IDE連携

| ツール | 説明 |
|--------|------|
| **Claude Code Chat** | VS Code用エレガントなチャットインターフェース |
| **claude-code-ide.el** | Emacs連携（ediffベース提案・LSP診断） |
| **claude-code.nvim** | Neovim連携 |
| **Claudix** | VS Code拡張（エディタ内チャットインターフェース） |
| **crystal** | フル機能デスクトップアプリ（エージェントオーケストレーション・監視・対話） |

### ステータスライン

| ツール | 説明 |
|--------|------|
| **CCometixLine** | 高性能Rust製ステータスライン（Git連携） |
| **ccstatusline** | 高カスタマイズ性ステータスラインフォーマッター |
| **claude-code-statusline** | 4行ステータスライン（テーマ・コスト追跡・MCPサーバー監視） |
| **claude-powerline** | Vim風Powerlineステータスライン |
| **claudia-statusline** | Rust製高性能ステータスライン（永続統計・プログレスバー） |

---

## ワークフロー・ナレッジガイド

### 開発ワークフロー

| リソース | 説明 |
|----------|------|
| **AB Method** | 仕様駆動ワークフロー（専門サブエージェント使用） |
| **Agentic Workflow Patterns** | エージェントパターン集（Mermaidダイアグラム付き） |
| **Claude Code PM** | 包括的プロジェクト管理ワークフロー（専門エージェント） |
| **Claude CodePro** | プロ開発環境（仕様駆動・TDD強制） |
| **Context Priming** | Claude Codeプライミングの体系的アプローチ |
| **Design Review Workflow** | 自動UI/UXデザインレビューワークフロー |
| **RIPER Workflow** | 構造化開発ワークフロー（Research・Innovate・Plan・Execute・Review） |
| **Simone** | 広範なプロジェクト管理ワークフロー |

### Ralph Wiggum シリーズ

| リソース | 説明 |
|----------|------|
| **Ralph for Claude Code** | 自律AI開発フレームワーク（安全ガードレール付き反復作業） |
| **Ralph Wiggum Marketer** | 自律AIコピーライタープラグイン |
| **ralph-orchestrator** | 堅牢なAI駆動開発オーケストレーションシステム |
| **The Ralph Playbook** | 詳細・包括的ガイド（理論解説・実践アドバイス） |

### ドキュメント・リファレンス

| リソース | 説明 |
|----------|------|
| **Claude Code Documentation Mirror** | Anthropicドキュメントミラー（数時間ごと更新） |
| **Claude Code System Prompts** | Claude Codeシステムプロンプト全部（バージョンごと更新） |
| **Claude Code Tips** | 35以上の情報密度の高いTips集（動作スクリプト・プラグイン） |
| **Claude Code Repos Index** | 75以上のClaude Codeリポジトリインデックス |
| **Claude Code Handbook** | ベストプラクティス・Tips・テクニック集 |

---

## インストール方法

### サブエージェント（VoltAgent）

```bash
# 対話型インストーラー
curl -sSL https://raw.githubusercontent.com/VoltAgent/awesome-claude-code-subagents/main/install.sh | bash

# 手動インストール
git clone https://github.com/VoltAgent/awesome-claude-code-subagents.git
cp -r awesome-claude-code-subagents/agents/* ~/.claude/agents/
```

### スラッシュコマンド

```bash
# リポジトリをクローン
git clone https://github.com/wshobson/commands.git
cp -r commands/tools/* ~/.claude/commands/
cp -r commands/workflows/* ~/.claude/commands/
```

### スキル

```bash
# 各スキルのリポジトリを確認してインストール
mkdir -p ~/.claude/skills
# スキルディレクトリをコピー
```

---

## 参考リンク

- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [wshobson/commands](https://github.com/wshobson/commands)
- [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts)
- [Claude Code公式ドキュメント](https://code.claude.com/docs/en/)
