# E2E Mocking Rules (Playwright)

目的: E2E の回帰を増やさず、Windows(Laragon)でも安定して回るテストを小さく積み上げる。

## Route Mocking

- `page.route()` は **LIFO**（後に登録したものが先にマッチしやすい）
- 上書きしたい mock は「後から」登録する
- 1 spec 内でルートが増えたら、最後に一覧化して衝突しないようにする

## Navigation / Wait

- `page.goto()` の `waitUntil` は “待ちたいもの” に合わせる
  - `waitUntil: "commit"`: 画面遷移が早い、SPA的な遷移で待ち過ぎたくない時
  - `waitUntil: "networkidle"`: ネットワークが落ち着くまで待つ必要がある時（不安定になりやすいので乱用しない）
- “URLが変わった” だけでは弱いので、最後に `data-testid` で画面到達を確認する

## Assertions

- 文言の揺れがある場所は `toContainText` / 正規表現寄りにする
- 画面到達の確認は `data-testid` を第一優先

## Test IDs

- UI変更で壊れやすい箇所（ボタン、カード、空状態、主要コンテナ）には `data-testid` を付ける
- 命名は `screen-xxx`, `xxx-submit`, `xxx-item` のように “役割ベース”

## Generated Code / String Trap

- `String.prototype.replace()` の置換関数で `$`` を参照するコードは避ける
  - `$`` は “直前の match 前の文字列” で、意図しない値になりやすい
- コード生成は `array.join("\\n")` のように、行配列→連結で作ると安全

## Related Docs

- Windows E2E 実行手順: `docs/CODEX_LONG_TASK_WINDOWS_E2E.md`
- PR#43 安定化メモ: `docs/GITHUB_AGENTS_PR43_WINDOWS_E2E.md`

