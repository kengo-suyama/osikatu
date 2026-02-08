# Unstable Checkout: Observe ログの解釈ガイド

## actionTag 分類表

capture-git-parent.ps1 が記録する `actionTag` ごとに、原因の切り分け方をまとめます。

| actionTag | 想定される原因 | 次の打ち手 |
|-----------|---------------|-----------|
| `checkout` | ブランチの切り替え（手動 or ツール自動） | `parentName` を確認 → Code.exe / GitHubDesktop / Laragon か判定 |
| `rebase` | `git pull --rebase` が走った | `parentCommandLine` を確認 → どのツールが実行したか特定 |
| `merge` | マージ操作 | 通常は問題なし。意図しないマージなら `parentName` で原因特定 |
| `fetch` | リモートからの取得 | 単体では問題なし。直後に checkout/rebase が続くか確認 |
| `reset` | `git reset` が実行された | ファイル消失の直接原因の可能性大。`parentName` を即確認 |
| `stash` | stash操作 | 一部ツールが自動でstashする。作業中ファイルが消える原因に |
| `unknown` | 分類不能 | `parentCommandLine` の生データを確認 |

## parentName 別の判定

### Code.exe（VSCode）
- **よくある行動**: Extension がバックグラウンドで `git status`, `git fetch` を実行
- **問題になるケース**: Git extension が auto-fetch → pull --rebase を自動実行
- **対策**: VSCode 設定で `git.autofetch` を `false` に

### GitHubDesktop
- **よくある行動**: 定期的に fetch → 自動マージ or rebase
- **問題になるケース**: 勝手にブランチを切り替え、rebase を実行
- **対策**: GitHub Desktop を閉じるか、対象リポジトリを除外

### Laragon
- **よくある行動**: 通常は Git 操作しない
- **問題になるケース**: auto-create project 機能が Git を触る場合
- **対策**: Laragon の Auto create virtual host を確認

### node / npm / npx
- **よくある行動**: husky の pre-commit フック
- **問題になるケース**: 通常は問題なし
- **対策**: `.husky/` 内のスクリプトを確認

## ログの読み方

```json
{
  "ts": "2026-02-06T10:23:45.123Z",
  "actionTag": "checkout",
  "parentName": "Code.exe",
  "parentPid": 12345,
  "parentCommandLine": "...",
  "gitArgs": "checkout main"
}
```

1. `actionTag` で操作種別を判定
2. `parentName` で犯人を特定
3. `parentCommandLine` で詳細を確認
4. `ts` で発生タイミングを特定 → 自分の操作と突合

## 関連ドキュメント

- [unstable-checkout-playbook.md](unstable-checkout-playbook.md) — 再発時の初動手順
- [e2e-stability.md](e2e-stability.md) — E2E flaky 対策
