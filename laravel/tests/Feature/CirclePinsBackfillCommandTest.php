<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CirclePin;
use App\Models\MeProfile;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class CirclePinsBackfillCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_backfill_command_creates_circle_pins_from_legacy_pinned_posts(): void
    {
        $user = User::factory()->create([
            'plan' => 'free',
        ]);

        $profile = MeProfile::create([
            'device_id' => 'device-pins-backfill-001',
            'nickname' => 'Owner',
            'initial' => 'O',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'Pins Backfill Circle',
            'plan' => 'free',
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

        $post = Post::create([
            'circle_id' => $circle->id,
            'author_member_id' => $member->id,
            'user_id' => $user->id,
            'post_type' => 'post',
            'body' => "Pack list\nURL: https://example.com\n- [ ] penlight",
            'tags' => [],
            'is_pinned' => true,
            'like_count' => 0,
        ]);

        $this->assertSame(0, CirclePin::query()->count());

        Artisan::call('app:backfill-circle-pins');

        $this->assertSame(1, CirclePin::query()->count());
        $pin = CirclePin::query()->first();
        $this->assertNotNull($pin);
        $this->assertSame($post->id, $pin->source_post_id);
        $this->assertSame('Pack list', $pin->title);
        $this->assertSame('https://example.com', $pin->url);
    }
}

