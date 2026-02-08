<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\User;
use App\Support\PlanGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanGatePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_requirePlus_returns_null_when_user_has_plus(): void
    {
        $user = User::factory()->create(['plan' => 'plus']);
        $result = PlanGate::requirePlus($user);
        $this->assertNull($result);
    }

    public function test_requirePlus_returns_402_when_user_is_free(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        $result = PlanGate::requirePlus($user);
        $this->assertNotNull($result);
        $this->assertEquals(402, $result->getStatusCode());
        $body = json_decode($result->getContent(), true);
        $this->assertEquals('PLAN_REQUIRED', $body['error']['code']);
    }

    public function test_requireCirclePlus_returns_null_when_circle_has_plus(): void
    {
        $circle = Circle::factory()->create(['plan' => 'plus']);
        $result = PlanGate::requireCirclePlus($circle);
        $this->assertNull($result);
    }

    public function test_requireCirclePlus_returns_402_when_circle_is_free(): void
    {
        $circle = Circle::factory()->create(['plan' => 'free']);
        $result = PlanGate::requireCirclePlus($circle);
        $this->assertNotNull($result);
        $this->assertEquals(402, $result->getStatusCode());
    }

    public function test_operation_log_returns_402_for_free_circle(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        MeProfile::create([
            'device_id' => 'dev-gate-test',
            'nickname' => 'Gate',
            'initial' => 'G',
            'user_id' => $user->id,
        ]);
        $circle = Circle::factory()->create(['plan' => 'free']);
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => 'dev-gate-test'])
            ->getJson("/api/circles/{\$circle->id}/logs");

        $response->assertStatus(402);
        $response->assertJsonPath('error.code', 'PLAN_REQUIRED');
    }
}
