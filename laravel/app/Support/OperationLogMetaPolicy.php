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
        'title',
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
        'request_id',
        'actor_user_id',
        'actor_circle_member_id',
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
        'settlement.create' => ['circleId', 'settlementId', 'amountInt', 'participantCount', 'transferCount', 'splitMode'],
        'settlement.update' => ['circleId', 'settlementId', 'transferCount'],
        'settlement_expense_created' => ['circleId', 'expenseId', 'amountInt', 'participantCount', 'splitMode', 'request_id'],
        'settlement_expense_voided' => ['circleId', 'expenseId', 'hasReplacement', 'request_id'],
        'settlement_expense_replaced' => ['circleId', 'expenseId', 'replacementExpenseId', 'request_id'],
        'proposal.approve' => ['proposalId', 'result', 'request_id'],
        'proposal.reject' => ['proposalId', 'result', 'request_id'],
        'billing.plan_update' => ['plan', 'actor_user_id', 'request_id'],
        'billing.webhook_received' => ['actor_user_id', 'request_id'],
        'pin.create' => ['circleId', 'actor_user_id', 'request_id'],
        'pin.update' => ['circleId', 'actor_user_id', 'request_id'],
        'pin.unpin' => ['circleId', 'actor_user_id', 'request_id'],
    ];

    public static function sanitize(string $action, array $meta): array
    {
        $allowed = self::ACTION_ALLOWED[$action] ?? self::GLOBAL_ALLOWED;
        $out = [];
        $numericKeys = [
            'mediaCount',
            'inviteCount',
            'participantCount',
            'transferCount',
            'amountInt',
            'settlementId',
            'circleId',
            'actor_user_id',
            'actor_circle_member_id',
        ];

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
                if (in_array($key, $numericKeys, true)) {
                    continue;
                }

                $normalized = trim($value);
                if ($normalized === '') {
                    continue;
                }

                if (self::isUrlLike($normalized)) {
                    continue;
                }

                $max = match ($key) {
                    'role' => 32,
                    'plan' => 16,
                    'source' => 32,
                    'reasonCode' => 32,
                    'splitMode' => 16,
                    'request_id' => 36,
                    default => 64,
                };

                if (self::isTooLong($normalized, $max)) {
                    continue;
                }

                $out[$key] = $normalized;
            }
        }

        return $out;
    }

    private static function isTooLong(string $value, int $max): bool
    {
        if ($max <= 0) {
            return true;
        }

        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            return mb_strlen($value) > $max;
        }

        return strlen($value) > $max;
    }

    private static function isUrlLike(string $value): bool
    {
        $lower = strtolower($value);
        if (str_contains($lower, 'http://') || str_contains($lower, 'https://')) {
            return true;
        }

        if (str_contains($lower, '://')) {
            return true;
        }

        if (str_contains($lower, 'www.')) {
            return true;
        }

        return false;
    }
}
