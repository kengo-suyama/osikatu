<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CirclePin;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CirclePinsProjectionTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithOwner(string $deviceId, string $userPlan): Circle
    {
        $user = User::factory()->create([
            'plan' => $userPlan,
        ]);

        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Owner',
            'initial' => 'O',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'Pins Projection Circle',
            'plan' => 'free',
            'plan_required' => 'free',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        return $circle;
    }

    public function test_store_pin_creates_circle_pin_projection_and_index_returns_it(): void
    {
        $circle = $this->createCircleWithOwner('device-pins-proj-001', 'plus');

        $body = "Meetup\nURL: https://example.com\n- [ ] bring penlight\n- [x] tickets";

        $res = $this->withHeaders([
            'X-Device-Id' => 'device-pins-proj-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => $body,
        ])->assertStatus(201);

        $postId = (int) $res->json('success.data.id');

        $pin = CirclePin::query()->where('source_post_id', $postId)->first();
        $this->assertNotNull($pin);
        $this->assertSame('Meetup', $pin->title);
        $this->assertSame('https://example.com', $pin->url);
        $this->assertSame($body, $pin->body);

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-proj-001',
        ])->getJson("/api/circles/{$circle->id}/pins")
            ->assertOk()
            ->assertJsonPath('success.data.0.sourcePostId', $postId)
            ->assertJsonPath('success.data.0.title', 'Meetup')
            ->assertJsonPath('success.data.0.url', 'https://example.com');
    }

    public function test_update_pin_updates_circle_pin_projection(): void
    {
        $circle = $this->createCircleWithOwner('device-pins-proj-002', 'plus');

        $res = $this->withHeaders([
            'X-Device-Id' => 'device-pins-proj-002',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => "Old\nURL: https://old.example\n- [ ] a",
        ])->assertStatus(201);

        $postId = (int) $res->json('success.data.id');

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-proj-002',
        ])->patchJson("/api/circles/{$circle->id}/pins/{$postId}", [
            'body' => "New\nURL: https://new.example\n- [x] a",
        ])->assertOk()
            ->assertJsonPath('success.data.id', $postId);

        $pin = CirclePin::query()->where('source_post_id', $postId)->first();
        $this->assertNotNull($pin);
        $this->assertSame('New', $pin->title);
        $this->assertSame('https://new.example', $pin->url);
    }

    public function test_unpin_deletes_circle_pin_projection(): void
    {
        $circle = $this->createCircleWithOwner('device-pins-proj-003', 'free');

        $res = $this->withHeaders([
            'X-Device-Id' => 'device-pins-proj-003',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 1',
        ])->assertStatus(201);

        $postId = (int) $res->json('success.data.id');

        $this->assertSame(1, CirclePin::query()->where('source_post_id', $postId)->count());

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-proj-003',
        ])->postJson("/api/circles/{$circle->id}/pins/{$postId}/unpin")
            ->assertOk()
            ->assertJsonPath('success.data.unpinned', true);

        $this->assertSame(0, CirclePin::query()->where('source_post_id', $postId)->count());
    }
}
