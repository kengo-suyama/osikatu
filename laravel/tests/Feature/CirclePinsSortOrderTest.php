<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Console\Commands\BackfillCirclePins;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CirclePin;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CirclePinsSortOrderTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithOwner(string $deviceId, string $plan = 'free'): array
    {
        $user = User::factory()->create(['plan' => $plan]);

        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Owner',
            'initial' => 'O',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'Sort Order Test',
            'plan' => $plan,
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

        return [$circle, $member, $profile];
    }

    public function test_new_pins_get_ascending_sort_order(): void
    {
        [$circle, $member, $profile] = $this->createCircleWithOwner('device-sort-001');

        $res1 = $this->withHeaders(['X-Device-Id' => 'device-sort-001'])
            ->postJson("/api/circles/{$circle->id}/pins-v2", ['body' => 'first pin']);
        $res1->assertStatus(201);
        $sort1 = $res1->json('success.data.sortOrder');
        $this->assertNotNull($sort1);

        $res2 = $this->withHeaders(['X-Device-Id' => 'device-sort-001'])
            ->postJson("/api/circles/{$circle->id}/pins-v2", ['body' => 'second pin']);
        $res2->assertStatus(201);
        $sort2 = $res2->json('success.data.sortOrder');
        $this->assertNotNull($sort2);

        $this->assertGreaterThan($sort1, $sort2);
    }

    public function test_get_pins_returns_newest_first(): void
    {
        [$circle, $member, $profile] = $this->createCircleWithOwner('device-sort-002');

        $this->withHeaders(['X-Device-Id' => 'device-sort-002'])
            ->postJson("/api/circles/{$circle->id}/pins-v2", ['body' => 'oldest'])
            ->assertStatus(201);

        $this->withHeaders(['X-Device-Id' => 'device-sort-002'])
            ->postJson("/api/circles/{$circle->id}/pins-v2", ['body' => 'newest'])
            ->assertStatus(201);

        $list = $this->withHeaders(['X-Device-Id' => 'device-sort-002'])
            ->getJson("/api/circles/{$circle->id}/pins");
        $list->assertOk();

        $items = $list->json('success.data');
        $this->assertCount(2, $items);
        $this->assertEquals('newest', $items[0]['title']);
        $this->assertEquals('oldest', $items[1]['title']);
    }

    public function test_backfill_sort_order_fills_null_values(): void
    {
        [$circle] = $this->createCircleWithOwner('device-sort-003');

        CirclePin::create([
            'circle_id' => $circle->id,
            'title' => 'older',
            'body' => 'older',
            'pinned_at' => now()->subHour(),
        ]);
        CirclePin::create([
            'circle_id' => $circle->id,
            'title' => 'newer',
            'body' => 'newer',
            'pinned_at' => now(),
        ]);

        $this->assertEquals(2, CirclePin::where('circle_id', $circle->id)->whereNull('sort_order')->count());

        $backfill = new BackfillCirclePins();
        $result = $backfill->backfillSortOrder(false);

        $this->assertEquals(1, $result['circles']);
        $this->assertEquals(2, $result['filled']);

        $this->assertEquals(0, CirclePin::where('circle_id', $circle->id)->whereNull('sort_order')->count());

        $older = CirclePin::where('circle_id', $circle->id)->where('title', 'older')->first();
        $newer = CirclePin::where('circle_id', $circle->id)->where('title', 'newer')->first();
        $this->assertLessThan($newer->sort_order, $older->sort_order);
    }

    public function test_backfill_sort_order_dry_run_does_not_modify(): void
    {
        [$circle] = $this->createCircleWithOwner('device-sort-004');

        CirclePin::create([
            'circle_id' => $circle->id,
            'title' => 'test',
            'body' => 'test',
            'pinned_at' => now(),
        ]);

        $backfill = new BackfillCirclePins();
        $result = $backfill->backfillSortOrder(true);

        $this->assertEquals(1, $result['filled']);
        $this->assertEquals(1, CirclePin::where('circle_id', $circle->id)->whereNull('sort_order')->count());
    }
}
