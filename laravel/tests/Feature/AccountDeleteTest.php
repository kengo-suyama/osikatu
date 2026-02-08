<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_can_be_deleted(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-delete-test',
            'nickname' => 'Test',
            'initial' => 'T',
            'user_id' => $user->id,
        ]);

        $response = $this->withHeaders(['X-Device-Id' => 'dev-delete-test'])
            ->deleteJson('/api/me/account');

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.status', 'deleted');

        // User should be soft-deleted
        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_deleted_account_cannot_access_api(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-deleted-test',
            'nickname' => 'Test',
            'initial' => 'T',
            'user_id' => $user->id,
        ]);
        $user->delete(); // soft delete

        $response = $this->withHeaders(['X-Device-Id' => 'dev-deleted-test'])
            ->getJson('/api/me');

        // Soft-deleted user should not be accessible
        $response->assertStatus(404);
    }
}
