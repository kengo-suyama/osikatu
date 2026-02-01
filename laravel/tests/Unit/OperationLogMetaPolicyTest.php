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
        ];

        $sanitized = OperationLogMetaPolicy::sanitize('join_request.reject', $meta);

        $this->assertSame([], $sanitized);
    }
}
