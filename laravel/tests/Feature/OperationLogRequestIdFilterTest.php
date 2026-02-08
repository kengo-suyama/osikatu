<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\OperationLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationLogRequestIdFilterTest extends TestCase
{
    use RefreshDatabase;

    private function setupCircleOwner(string $deviceId): array
    {
        $user = User::factory()->create(['plan' => 'plus']);

        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Owner',
            'initial' => 'O',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'Log Filter Test',
            'plan' => 'plus',
            'plan_required' => 'free',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        $member = CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        return [$user, $circle, $member, $profile];
    }

    public function test_circle_logs_filtered_by_request_id(): void
    {
        [$user, $circle] = $this->setupCircleOwner('device-logfilter-001');

        $reqIdA = 'aaaa-1111-2222-3333';
        $reqIdB = 'bbbb-4444-5555-6666';

        OperationLog::create([
            'user_id' => $user->id,
            'circle_id' => $circle->id,
            'action' => 'test.alpha',
            'meta' => ['request_id' => $reqIdA],
            'created_at' => now(),
        ]);

        OperationLog::create([
            'user_id' => $user->id,
            'circle_id' => $circle->id,
            'action' => 'test.beta',
            'meta' => ['request_id' => $reqIdB],
            'created_at' => now(),
        ]);

        // No filter → both returned
        $all = $this->withHeaders(['X-Device-Id' => 'device-logfilter-001'])
            ->getJson("/api/circles/{$circle->id}/logs");
        $all->assertOk();
        $this->assertCount(2, $all->json('success.data.items'));

        // Filter by reqIdA → only alpha
        $filtered = $this->withHeaders(['X-Device-Id' => 'device-logfilter-001'])
            ->getJson("/api/circles/{$circle->id}/logs?request_id={$reqIdA}");
        $filtered->assertOk();

        $items = $filtered->json('success.data.items');
        $this->assertCount(1, $items);
        $this->assertEquals('test.alpha', $items[0]['action']);
    }

    public function test_no_match_returns_empty(): void
    {
        [$user, $circle] = $this->setupCircleOwner('device-logfilter-002');

        OperationLog::create([
            'user_id' => $user->id,
            'circle_id' => $circle->id,
            'action' => 'test.gamma',
            'meta' => ['request_id' => 'cccc-7777-8888-9999'],
            'created_at' => now(),
        ]);

        $res = $this->withHeaders(['X-Device-Id' => 'device-logfilter-002'])
            ->getJson("/api/circles/{$circle->id}/logs?request_id=nonexistent");
        $res->assertOk();
        $this->assertCount(0, $res->json('success.data.items'));
    }
}
