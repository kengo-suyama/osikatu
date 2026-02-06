<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\OshiActionLog;
use App\Models\TitleAward;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OshiActionCompletionIdempotentTest extends TestCase
{
    use RefreshDatabase;

    private function createDevice(string $deviceId): User
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => $deviceId,
            'user_id' => $user->id,
            'nickname' => 'Member',
            'initial' => 'M',
        ]);

        return $user;
    }

    public function test_completion_is_idempotent_for_same_date(): void
    {
        $deviceId = 'device-oshi-001';
        $dateKey = '2026-02-05';
        $this->createDevice($deviceId);

        $first = $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/me/oshi-actions/complete', [
            'dateKey' => $dateKey,
        ]);

        $first->assertStatus(200)
            ->assertJsonPath('success.data.dateKey', $dateKey);

        $profile = MeProfile::where('device_id', $deviceId)->firstOrFail();
        $user = User::findOrFail($profile->user_id);

        $totalAfterFirst = (int) $user->oshi_action_total;
        $streakAfterFirst = (int) $user->oshi_action_streak;
        $awardsAfterFirst = TitleAward::where('user_id', $user->id)->count();
        $logsAfterFirst = OshiActionLog::where('user_id', $user->id)->count();

        $this->assertGreaterThanOrEqual(1, $totalAfterFirst);
        $this->assertGreaterThanOrEqual(1, $logsAfterFirst);

        $second = $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/me/oshi-actions/complete', [
            'dateKey' => $dateKey,
        ]);

        $second->assertStatus(200)
            ->assertJsonPath('success.data.actionTotal', $totalAfterFirst);

        $user->refresh();
        $this->assertSame($totalAfterFirst, (int) $user->oshi_action_total);
        $this->assertSame($streakAfterFirst, (int) $user->oshi_action_streak);
        $this->assertSame($awardsAfterFirst, TitleAward::where('user_id', $user->id)->count());
        $this->assertSame($logsAfterFirst, OshiActionLog::where('user_id', $user->id)->count());
    }
}
