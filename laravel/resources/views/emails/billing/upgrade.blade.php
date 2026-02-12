@component('mail::message')
# Plusプランへようこそ！

{{ $userName }} 様

Plusプランへのアップグレードが完了しました。

## ご利用いただける機能

- サークル無制限参加
- 割り勘機能
- サークル招待管理
- 詳細な操作ログ

ご不明な点がございましたらお気軽にお問い合わせください。

@component('mail::button', ['url' => config('app.url')])
Ositaku を開く
@endcomponent

{{ config('app.name') }}
@endcomponent
