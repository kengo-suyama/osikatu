<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_only_me_returns_guest_with_device_id_and_null_user_id(): void
    {
        $deviceId = 'device-auth-guest-001';

        $res = $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->getJson('/api/me');

        $res->assertStatus(200)
            ->assertJsonPath('success.data.deviceId', $deviceId)
            ->assertJsonPath('success.data.userId', null)
            ->assertJsonPath('success.data.role', 'guest')
            ->assertJsonPath('success.data.plan', 'free');
    }

    public function test_link_start_then_complete_sets_real_email_and_me_has_user_id(): void
    {
        $deviceId = 'device-auth-link-001';

        $start = $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/auth/link/start', [
            'email' => 'me+link@example.com',
            'password' => 'password123',
        ]);

        $start->assertStatus(201)
            ->assertJsonPath('success.data.linkToken', fn ($v) => is_string($v) && strlen($v) >= 16);

        $token = (string) $start->json('success.data.linkToken');

        $complete = $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/auth/link/complete', [
            'linkToken' => $token,
        ]);

        $complete->assertStatus(200)
            ->assertJsonPath('success.data.deviceId', $deviceId)
            ->assertJsonPath('success.data.role', 'user')
            ->assertJsonPath('success.data.email', 'me+link@example.com');

        $meId = (int) $complete->json('success.data.id');
        $complete->assertJsonPath('success.data.userId', $meId);

        $user = User::query()->find($meId);
        $this->assertNotNull($user);
        $this->assertSame('me+link@example.com', $user->email);
        $this->assertTrue(Hash::check('password123', (string) $user->password));
    }

    public function test_bearer_token_allows_me_without_device_header(): void
    {
        $deviceId = 'device-auth-session-001';

        $created = $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/auth/session');

        $created->assertStatus(201)
            ->assertJsonPath('success.data.token', fn ($v) => is_string($v) && strlen($v) >= 16);

        $token = (string) $created->json('success.data.token');

        $me = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->getJson('/api/me');

        $me->assertStatus(200)
            ->assertJsonPath('success.data.deviceId', $deviceId);
    }
}

