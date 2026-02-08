<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\OperationLogMetaPolicy;
use PHPUnit\Framework\TestCase;

class OperationLogMetaSchemaTest extends TestCase
{
    public function test_settlement_meta_allows_standardized_keys(): void
    {
        $meta = OperationLogMetaPolicy::sanitize('settlement.create', [
            'circleId' => 1,
            'settlementId' => 100,
            'amountInt' => 5000,
            'participantCount' => 3,
            'transferCount' => 2,
            'splitMode' => 'equal',
            'actor_user_id' => 42,
            'request_id' => 'req-test-001',
        ]);

        $this->assertArrayHasKey('circleId', $meta);
        $this->assertArrayHasKey('request_id', $meta);
        // actor_user_id is in global allowed but settlement.create action doesn't include it
        // so it should be filtered out
        $this->assertArrayNotHasKey('actor_user_id', $meta);
    }

    public function test_billing_meta_allows_standardized_keys(): void
    {
        $meta = OperationLogMetaPolicy::sanitize('billing.plan_update', [
            'plan' => 'plus',
            'actor_user_id' => 42,
            'request_id' => 'req-billing-001',
            'email' => 'secret@example.com', // should be filtered
        ]);

        $this->assertArrayHasKey('plan', $meta);
        $this->assertArrayHasKey('actor_user_id', $meta);
        $this->assertArrayHasKey('request_id', $meta);
        $this->assertArrayNotHasKey('email', $meta);
    }

    public function test_pin_meta_allows_standardized_keys(): void
    {
        $meta = OperationLogMetaPolicy::sanitize('pin.create', [
            'circleId' => 1,
            'actor_user_id' => 42,
            'request_id' => 'req-pin-001',
        ]);

        $this->assertArrayHasKey('circleId', $meta);
        $this->assertArrayHasKey('actor_user_id', $meta);
        $this->assertArrayHasKey('request_id', $meta);
    }

    public function test_global_allowed_includes_actor_keys(): void
    {
        // Unknown action uses global allowed
        $meta = OperationLogMetaPolicy::sanitize('unknown.action', [
            'request_id' => 'req-test',
            'actor_user_id' => 10,
            'actor_circle_member_id' => 20,
        ]);

        $this->assertArrayHasKey('request_id', $meta);
        $this->assertArrayHasKey('actor_user_id', $meta);
        $this->assertArrayHasKey('actor_circle_member_id', $meta);
    }
}
