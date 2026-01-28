# 推し活支援アプリ（フロントエンド）

推し活のログ・支出・予定を一画面で管理できるモバイルファーストUIを目指したフロントエンドです。Laravel REST API 連携を前提に、Next.js App Router で段階的に構築しています。

## セットアップ

```bash
cd frontend
npm install
```

必要に応じて以下の依存関係を追加インストールします。

```bash
npm i next-themes lucide-react framer-motion chart.js react-chartjs-2
```

## 概要
- 推し切替 UI（ヘッダー）
- Bottom Navigation による5画面構成
- ダミーデータで動作確認可能
- Next.js Server Components で API 取得を想定
- SNSライクな Framer Motion アニメーション

## 使用技術
- Next.js（App Router）
- TypeScript
- Tailwind CSS
- shadcn/ui（Button / Card / Dialog / Tabs / Select / Input / Textarea / Toast）
- next-themes（ダークモード）
- lucide-react（アイコン）
- framer-motion（SNSライクなアニメーション）
- Chart.js / react-chartjs-2（支出グラフ）

## 画面構成
- /home: 今日のサマリー + ログ一覧
- /log: 推し活ログ一覧
- /money: 支出カード + グラフ
- /schedule: 予定一覧
- /settings: テーマ・アカウント設定

## 設計で意識した点
- page.tsx は Server Component を維持
- fetch は Server Component 側で実行し、失敗時はダミーデータにフォールバック
- Client Component は操作UI（Dialog/Toast/Framer Motion）に限定
- Header/BottomNavigation を共通化して責務分離
- Framer Motion の設定を共通定数化して派手すぎない動きに統一

## 今後の拡張
- Laravel REST API と連携して実データ取得
- 追加のフォームUI（ログ入力、支出登録）
- 通知やイベント連携などの機能拡張

## 開発メモ
- `NEXT_PUBLIC_API_BASE_URL` を設定すると API 取得に切り替わります。
- フロントエンドは `frontend/` 配下に構成しています。
