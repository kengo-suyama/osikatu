<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationReadAllTest extends TestCase
{
    use RefreshDatabase;

    public function test_read_all_marks_unread_notifications(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'device-readall-001',
            'nickname' => 'Test',
            'initial' => 'T',
            'user_id' => $user->id,
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'test',
            'title' => 'Unread 1',
            'body' => 'body',
        ]);
        Notification::create([
            'user_id' => $user->id,
            'type' => 'test',
            'title' => 'Unread 2',
            'body' => 'body',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-readall-001',
        ])->postJson('/api/me/notifications/read-all');

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.markedCount', 2);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'read_at' => null,
        ]);
    }

    public function test_read_all_returns_zero_when_all_read(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'device-readall-002',
            'nickname' => 'Test2',
            'initial' => 'T',
            'user_id' => $user->id,
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-readall-002',
        ])->postJson('/api/me/notifications/read-all');

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.markedCount', 0);
    }
}
