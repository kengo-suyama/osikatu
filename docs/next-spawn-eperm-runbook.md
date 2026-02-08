# Windows E2E Runbook (Laragon)

目的: Windows + Laragon で `npm run e2e:ci` を「何も考えずに」回すための復旧手順メモ。

## まずこれ

```powershell
cd C:\laragon\www\osikatu\frontend
npm run e2e:ci -- --repeat 1
```

失敗したら:

```powershell
cd C:\laragon\www\osikatu\frontend
npm run e2e:doctor
```

## ポート競合 (3103 / 8001)

E2E は以下を使います:
- Frontend (Next dev): `127.0.0.1:3103`
- Backend (artisan serve): `127.0.0.1:8001`

`npm run e2e:ci` の wrapper は開始前に preflight を実行し、**known-safe (この repo 由来と確証が取れるもの) のみ**を自動終了します。

- dev: auto-kill 有効 (既定)
- CI (`CI=true`): auto-kill 無効 (チェックのみ)
- dev で無効化したい場合: `E2E_KILL_KNOWN_LISTENERS=0`

unknown (不明) なプロセスは kill しません。PID と CommandLine が表示されるので、該当アプリを終了して再実行してください。

手動で PID を調べる:

```powershell
netstat -ano | findstr :8001
netstat -ano | findstr :3103
```

## SQLite 破損 (database disk image is malformed)

E2E は `laravel/storage/osikatu-e2e.sqlite` を使用します。

`migrate:fresh` が以下で落ちる場合:
- `database disk image is malformed`
- `file is not a database`

wrapper が自動で 1 回だけ復旧を試みます:
1. sqlite を削除
2. 空ファイルを再生成
3. `migrate:fresh` を 1 回だけリトライ

それでもダメな場合の手動復旧:

```powershell
cd C:\laragon\www\osikatu
Remove-Item laravel\storage\osikatu-e2e.sqlite -Force
New-Item -ItemType File laravel\storage\osikatu-e2e.sqlite -Force
```

## Git lock / IDE 自動 checkout

E2E wrapper は `.git/index.lock` / `.git/HEAD.lock` を使って、IDE の自動 checkout をブロックします。

もし `lock exists but was not created by our tools` が出た場合:
- 本当に git 操作が走っていないことを確認してから、該当 lock を削除して再実行してください

## 追加コマンド

preflight だけ実行:

```powershell
cd C:\laragon\www\osikatu\frontend
npm run e2e:preflight
```

