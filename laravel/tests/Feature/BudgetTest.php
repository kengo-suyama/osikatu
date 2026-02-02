<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Budget',
            'initial' => 'B',
        ]);
    }

    public function test_get_returns_default_when_empty(): void
    {
        $profile = $this->createProfile('device-budget-001');

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/budget?yearMonth=2026-02');

        $response->assertStatus(200)
            ->assertJsonPath('success.data.yearMonth', '2026-02')
            ->assertJsonPath('success.data.budget', 0)
            ->assertJsonPath('success.data.spent', 0)
            ->assertJsonPath('success.data.updatedAt', null);
    }

    public function test_put_creates_and_updates_budget(): void
    {
        $profile = $this->createProfile('device-budget-002');

        $create = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->putJson('/api/me/budget', [
                'yearMonth' => '2026-02',
                'budget' => 30000,
            ]);

        $create->assertStatus(200)
            ->assertJsonPath('success.data.yearMonth', '2026-02')
            ->assertJsonPath('success.data.budget', 30000);

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->putJson('/api/me/budget', [
                'yearMonth' => '2026-02',
                'budget' => 50000,
            ])
            ->assertStatus(200)
            ->assertJsonPath('success.data.budget', 50000);

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/budget?yearMonth=2026-02')
            ->assertStatus(200)
            ->assertJsonPath('success.data.budget', 50000);
    }

    public function test_validation_rejects_invalid_input(): void
    {
        $profile = $this->createProfile('device-budget-003');

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->putJson('/api/me/budget', [
                'yearMonth' => '2026/02',
                'budget' => -1,
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_unauthorized_without_device(): void
    {
        $this->putJson('/api/me/budget', [
            'yearMonth' => '2026-02',
            'budget' => 1000,
        ])->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHORIZED');
    }
}
