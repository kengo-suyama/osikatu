<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PinsV1DenySwitchTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId, string $role, string $userPlan): Circle
    {
        $user = User::factory()->create([
            'plan' => $userPlan,
        ]);

        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'Pins v1 Deny Switch Test Circle',
            'plan' => 'free',
            'plan_required' => 'free',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => $role,
            'joined_at' => now(),
        ]);

        return $circle;
    }

    public function test_v1_write_delegate_allows_and_sets_deprecated_headers_and_logs(): void
    {
        config(['pins.v1_write_mode' => 'delegate']);
        Log::spy();

        $circle = $this->createCircleWithMember('device-pins-v1-delegate-001', 'owner', 'free');

        $res = $this->withHeaders([
            'X-Device-Id' => 'device-pins-v1-delegate-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 1',
        ]);

        $res->assertStatus(201)
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
            ->assertHeader('X-Osikatu-Use', "/api/circles/{$circle->id}/pins-v2")
            ->assertJsonPath('success.data.isPinned', true);

        Log::shouldHaveReceived('info')
            ->withArgs(function ($message, $context) use ($circle): bool {
                if ($message !== 'pins_v1_write_called') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['circle_id'] ?? null) === $circle->id
                    && ($context['action'] ?? null) === 'create'
                    && ($context['result'] ?? null) === 'allow';
            })
            ->once();
    }

    public function test_v1_write_deny_returns_410_and_sets_headers_and_logs(): void
    {
        config(['pins.v1_write_mode' => 'deny']);
        Log::spy();

        $circle = $this->createCircleWithMember('device-pins-v1-deny-001', 'owner', 'free');

        $res = $this->withHeaders([
            'X-Device-Id' => 'device-pins-v1-deny-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 1',
        ]);

        $res->assertStatus(410)
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
            ->assertHeader('X-Osikatu-Use', "/api/circles/{$circle->id}/pins-v2")
            ->assertJsonPath('error.code', 'PINS_V1_DEPRECATED');

        Log::shouldHaveReceived('info')
            ->withArgs(function ($message, $context) use ($circle): bool {
                if ($message !== 'pins_v1_write_called') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['circle_id'] ?? null) === $circle->id
                    && ($context['action'] ?? null) === 'create'
                    && ($context['result'] ?? null) === 'deny'
                    && ($context['http_status'] ?? null) === 410;
            })
            ->once();
    }
}

