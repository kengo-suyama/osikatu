<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\OperationLogMetaPolicy;
use PHPUnit\Framework\TestCase;

class OperationLogMetaPolicyTest extends TestCase
{
    public function test_forbidden_keys_are_removed(): void
    {
        $meta = [
            'message' => 'secret',
            'url' => 'https://example.com',
            'frameId' => 'festival_gold',
            'mediaCount' => 2,
        ];

        $sanitized = OperationLogMetaPolicy::sanitize('oshi_media.change_frame', $meta);

        $this->assertArrayNotHasKey('message', $sanitized);
        $this->assertArrayNotHasKey('url', $sanitized);
        $this->assertSame('festival_gold', $sanitized['frameId'] ?? null);
        $this->assertArrayNotHasKey('mediaCount', $sanitized);
    }

    public function test_allowed_keys_survive_and_are_normalized(): void
    {
        $meta = [
            'frameId' => str_repeat('a', 100),
            'mediaCount' => -3,
        ];

        $sanitized = OperationLogMetaPolicy::sanitize('chat_message.create', $meta);

        $this->assertArrayNotHasKey('frameId', $sanitized);
        $this->assertSame(0, $sanitized['mediaCount'] ?? null);
    }

    public function test_url_like_strings_are_removed(): void
    {
        $meta = [
            'reasonCode' => 'https://example.com',
            'source' => 'www.example.com',
        ];

        $sanitized = OperationLogMetaPolicy::sanitize('join_request.reject', $meta);

        $this->assertSame([], $sanitized);
    }

    public function test_settlement_meta_allows_counts_only(): void
    {
        $meta = [
            'circleId' => 1,
            'settlementId' => 12,
            'participantCount' => 3,
            'transferCount' => 2,
            'amountInt' => 8400,
            'splitMode' => 'equal',
            'unknownKey' => 'safe',
            'title' => '秘密メモ',
            'members' => [1, 2],
        ];

        $sanitized = OperationLogMetaPolicy::sanitize('settlement.create', $meta);

        $this->assertSame(1, $sanitized['circleId'] ?? null);
        $this->assertSame(12, $sanitized['settlementId'] ?? null);
        $this->assertSame(3, $sanitized['participantCount'] ?? null);
        $this->assertSame(2, $sanitized['transferCount'] ?? null);
        $this->assertSame(8400, $sanitized['amountInt'] ?? null);
        $this->assertSame('equal', $sanitized['splitMode'] ?? null);
        $this->assertArrayNotHasKey('unknownKey', $sanitized);
        $this->assertArrayNotHasKey('title', $sanitized);
        $this->assertArrayNotHasKey('members', $sanitized);
    }

    public function test_array_and_long_strings_are_removed(): void
    {
        $meta = [
            'reasonCode' => str_repeat('a', 300),
            'mode' => ['x' => 'y'],
        ];

        $sanitized = OperationLogMetaPolicy::sanitize('join_request.create', $meta);

        $this->assertSame([], $sanitized);
    }
}
