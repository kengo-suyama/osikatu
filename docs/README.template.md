# Osikatu
推し活の「今」を、映えるフィードに。

> この README は `docs/README.template.md` から自動生成されます。更新後は `npm run readme:gen` を実行してください。

## 概要
- 推し活の記録・支出・予定をまとめるモバイル特化アプリ
- Next.js App Router + Tailwind + shadcn/ui + Framer Motion で構築
- Laravel REST API 連携を前提に拡張

## Screenshots (390px)
### Home
- 推しヒーロー（画像） + Quick Actions + 供給Tabs + 次の締切 + Moneyスナップ + ミニFeed

![Home](docs/screenshots/home.png)

### Log (SNS)
- 画像付き投稿2件 + テキスト投稿2件 + タグchips + テンプレ投稿ボタン

![Log](docs/screenshots/log.png)

### Money
- 今月残り（大） + カテゴリ（グラフ） + 明細リスト

![Money](docs/screenshots/money.png)

### Schedule
- チケットタイムライン + 次の締切横スクロール

![Schedule](docs/screenshots/schedule.png)

### Settings
- 推し管理（推し切替 / 推しカラー / 画像変更）※MVPはUIだけでもOK

![Settings](docs/screenshots/settings.png)

## Repo structure
- `/frontend` ... Next.js app
- `/laravel` ... Laravel API backend

## Frontend
### セットアップ（開発サーバ）
```powershell
cd C:\laragon\www\osikatu\frontend
npm install
npm run dev
# http://localhost:3000
```

### データソース切替
- `NEXT_PUBLIC_DATA_SOURCE=local` の場合は localStorage モード（MVP）
- `NEXT_PUBLIC_DATA_SOURCE=api` の場合は Laravel API モード

## Backend
### セットアップ（Laravel）
```powershell
cd C:\laragon\www\osikatu\laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve --port=8000
# http://localhost:8000
```

## 環境変数
`frontend/.env.local` を作成:
```env
NEXT_PUBLIC_DATA_SOURCE=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## DTO / API envelope
### 成功レスポンス
```json
{
  "success": {
    "data": {},
    "meta": {}
  }
}
```

### 失敗レスポンス
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "message",
    "details": {}
  }
}
```

### ルール
- すべて camelCase
- DTO 形状は固定（変更時は `frontend/lib/types.ts` と同時更新）

## Owner Dashboard
### サンプルJSON
```json
<!-- INCLUDE:OWNER_DASHBOARD_SAMPLE -->
```

### デモ用シード & 確認
```powershell
cd C:\laragon\www\osikatu\laravel
composer install
php artisan config:clear
php artisan migrate:fresh
php artisan db:seed --class=OwnerDashboardDemoSeeder
php artisan storage:link
php artisan serve --port=8000
```

#### API 疎通（OwnerDashboard）
```powershell
curl.exe -s -H "X-Device-Id: demo-device-001" http://localhost:8000/api/circles/1/owner-dashboard
```

#### Frontend 確認
```powershell
cd C:\laragon\www\osikatu\frontend
npm install
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run dev
```

ブラウザ: `http://localhost:3000/home`

## サークル導線の確認（個人モード → 検索 → 0件UI → 作成/招待）
```powershell
# Backend
cd C:\laragon\www\osikatu\laravel
php artisan migrate
php artisan db:seed --class=OwnerDashboardDemoSeeder

# Frontend
cd C:\laragon\www\osikatu\frontend
npm run dev
```

1) Home を開く（招待なし）
- 個人モードで利用できることを確認

2) サークルカード → 「サークルを探す」
- 検索ダイアログが開くこと

3) 該当しない条件で検索
- 0件UIが出て「作る / 続ける / 招待」の3択が表示されること

4) 「作る」
- Plus/trial は作成ダイアログ
- Free はガード表示で止まること

5) 「招待」
- 招待コード入力導線へ遷移すること

## サークルを広める方法
### 公開サークル参加の流れ（承認制）
- 招待なしでも個人モードで利用できます（ログ/予定/支出/推し管理）
- 公開サークル検索 → 参加リクエスト → 承認で参加できます
- 招待コードで参加した初回ユーザーは 7日トライアルが付与されます
- 参加後は `/circles/{id}/chat` で合流できます（Freeは月30メッセージまで）

### 拡散の手順
1. サークルを作成（Plus）
2. 招待コードをコピー
3. SNSにそのまま投稿

### 推奨テンプレ（アプリ内共有ボタンからコピーできます）
#### 1) 個人向け
```
推し活用にサークル管理アプリ使い始めた🌸 遠征・入金・出欠が全部まとまって助かる…

推し：{{oshiLabel}}
招待コード：{{inviteCode}}

https://osikatu.app
#推し活 #オタ活
```

#### 2) 遠征前
```
遠征班用にサークル作りました✈️ 入金・出欠の管理が一瞬で終わる…

初参加は7日間お試しOK◎
招待コード：{{inviteCode}}

https://osikatu.app
#遠征 #推し活
```

#### 3) 運営者向け
```
サークル運営が楽になるアプリ作りました🌸 未確認・未払いが一目で分かるのが最高。

承認制で安心して使えます◎
招待コード：{{inviteCode}}

https://osikatu.app
#サークル運営 #推し活
```

### 注意
- ハッシュタグは2〜3個まで、URLは末尾に置く
- Freeは参加サークル1つまで（trial中は増えます）

## README 自動生成
### 使い方
```powershell
cd C:\laragon\www\osikatu
node .\scripts\generate-readme.mjs
```

### npm スクリプト
```powershell
cd C:\laragon\www\osikatu
npm run readme:gen
```

### 任意: pre-commit hook（simple-git-hooks）
```powershell
cd C:\laragon\www\osikatu
npm install
npm run hooks:enable
```

無効化:
```powershell
cd C:\laragon\www\osikatu
npm run hooks:disable
```

## トラブルシューティング
- Radix の Module not found エラーが出る場合:
  ```powershell
  cd C:\laragon\www\osikatu\frontend
  npm i @radix-ui/react-accordion @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-switch
  ```
- Next.js の cache 破損が疑われる場合:
  ```powershell
  cd C:\laragon\www\osikatu\frontend
  if (Test-Path .next) { Remove-Item .next -Recurse -Force }
  ```
- 文字コードは **UTF-8 (BOMなし)** を厳守

## AGENTS (Project rules)
````text
<!-- INCLUDE:AGENTS -->
````
