<?php

declare(strict_types=1);

namespace App\Support;

final class OperationLogMetaPolicy
{
    private const FORBIDDEN_KEYS = [
        'message',
        'body',
        'text',
        'content',
        'detail',
        'details',
        'note',
        'notes',
        'memo',
        'url',
        'imageurl',
        'videourl',
        'file',
        'filename',
        'file_name',
        'path',
        'imagepath',
        'displayname',
        'name',
        'email',
        'phone',
        'address',
        'ip',
        'useragent',
        'ua',
    ];

    private const GLOBAL_ALLOWED = [
        'enabled',
        'specialBg',
        'mediaCount',
        'frameId',
        'themeId',
        'inviteCount',
        'role',
        'plan',
        'source',
        'reasonCode',
        'hasImage',
        'messageId',
        'mode',
    ];

    private const ACTION_ALLOWED = [
        'chat_message.create' => ['hasImage', 'mediaCount'],
        'chat_message.delete' => ['messageId', 'mediaCount'],
        'join_request.create' => ['mode', 'reasonCode'],
        'join_request.approve' => ['mode', 'reasonCode'],
        'join_request.reject' => ['reasonCode'],
        'oshi_media.change_frame' => ['frameId'],
        'circle.ui.theme.update' => ['themeId'],
        'circle.ui.special_bg.update' => ['enabled', 'specialBg'],
    ];

    public static function sanitize(string $action, array $meta): array
    {
        $allowed = self::ACTION_ALLOWED[$action] ?? self::GLOBAL_ALLOWED;
        $out = [];

        foreach ($meta as $key => $value) {
            if (!is_string($key)) {
                continue;
            }

            $lowerKey = strtolower($key);
            if (in_array($lowerKey, self::FORBIDDEN_KEYS, true)) {
                continue;
            }

            if (!in_array($key, $allowed, true)) {
                continue;
            }

            if (is_array($value) || is_object($value)) {
                continue;
            }

            if (is_bool($value)) {
                $out[$key] = $value;
                continue;
            }

            if (is_int($value)) {
                $out[$key] = max(0, $value);
                continue;
            }

            if (is_float($value)) {
                $out[$key] = $value;
                continue;
            }

            if (is_string($value)) {
                $normalized = trim($value);
                if ($normalized === '') {
                    continue;
                }

                if (stripos($normalized, 'http://') !== false || stripos($normalized, 'https://') !== false) {
                    continue;
                }

                $max = match ($key) {
                    'role' => 32,
                    'plan' => 16,
                    'source' => 32,
                    'reasonCode' => 32,
                    default => 64,
                };

                $normalized = self::truncate($normalized, $max);
                if ($normalized === '') {
                    continue;
                }

                $out[$key] = $normalized;
            }
        }

        return $out;
    }

    private static function truncate(string $value, int $max): string
    {
        if ($max <= 0) {
            return '';
        }

        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            if (mb_strlen($value) > $max) {
                return mb_substr($value, 0, $max);
            }
            return $value;
        }

        if (strlen($value) > $max) {
            return substr($value, 0, $max);
        }

        return $value;
    }
}
