@component('mail::message')
# お支払いに問題があります

{{ $userName }} 様

最新のお支払いが処理できませんでした。

お支払い方法を更新していただくと、Plusプランを引き続きご利用いただけます。

@component('mail::button', ['url' => $portalUrl])
お支払い方法を更新
@endcomponent

更新がない場合、プランが自動的にFreeに戻る場合があります。

{{ config('app.name') }}
@endcomponent
