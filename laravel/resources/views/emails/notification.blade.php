<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="font-size: 18px;">{{ $notificationTitle }}</h2>
    <p style="font-size: 14px; color: #555;">{{ $notificationBody }}</p>
    @if($actionUrl)
        <p style="margin-top: 20px;">
            <a href="{{ $actionUrl }}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
                \u8A73\u7D30\u3092\u898B\u308B
            </a>
        </p>
    @endif
    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 11px; color: #999;">\u304A\u3057\u304B\u3064 - \u63A8\u3057\u6D3B\u3092\u3082\u3063\u3068\u697D\u3057\u304F</p>
</body>
</html>
