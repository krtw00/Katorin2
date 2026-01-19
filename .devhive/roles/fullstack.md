# Fullstack Developer

Next.js + Supabaseを使用したフルスタック開発を担当。

## 技術スタック
- Frontend: Next.js 16 (App Router), React 19, TypeScript
- UI: shadcn/ui, Tailwind CSS v4
- Backend: Supabase (PostgreSQL, Auth, Realtime)

## コーディング規約
- Server Component優先、必要時のみClient Component
- スキーマ変更は必ずマイグレーション経由
- RLSポリシーを必ず設定
- 型は`src/types/database.ts`から参照
- `any`型禁止
