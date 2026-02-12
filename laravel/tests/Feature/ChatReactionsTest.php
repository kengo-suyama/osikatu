<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\MessageReaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatReactionsTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId): array
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Reactor',
            'initial' => 'R',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'テストサークル',
            'description' => 'リアクションテスト',
            'oshi_label' => '推し',
            'oshi_tag' => 'test',
            'oshi_tags' => ['test'],
            'is_public' => true,
            'plan' => 'free',
            'plan_required' => 'free',
            'join_policy' => 'request',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        $member = CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);

        return [$circle, $member, $profile, $user];
    }

    public function test_can_add_reaction(): void
    {
        [$circle, $member, $profile] = $this->createCircleWithMember('device-react-001');

        $message = ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'message_type' => 'text',
            'body' => 'Hello!',
            'created_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions", [
                'emoji' => '❤️',
            ]);

        $response->assertStatus(201);
        $data = $response->json('success.data');
        $this->assertArrayHasKey('counts', $data);
        $this->assertArrayHasKey('myReacted', $data);
        $this->assertEquals(1, $data['counts']['❤️']);
        $this->assertContains('❤️', $data['myReacted']);

        $this->assertDatabaseHas('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $profile->user_id,
            'emoji' => '❤️',
        ]);
    }

    public function test_can_remove_reaction(): void
    {
        [$circle, $member, $profile] = $this->createCircleWithMember('device-react-002');

        $message = ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'message_type' => 'text',
            'body' => 'Bye!',
            'created_at' => now(),
        ]);

        MessageReaction::create([
            'message_id' => $message->id,
            'user_id' => $profile->user_id,
            'emoji' => '👍',
            'created_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions/remove", [
                'emoji' => '👍',
            ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertEmpty((array) $data['counts']);
        $this->assertEmpty($data['myReacted']);

        $this->assertDatabaseMissing('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $profile->user_id,
            'emoji' => '👍',
        ]);
    }

    public function test_reaction_counts_are_correct(): void
    {
        [$circle, $memberA, $profileA] = $this->createCircleWithMember('device-react-003');
        [, , $profileB] = $this->createCircleWithMember('device-react-004');

        // Add user B to circle A
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $profileB->user_id,
            'me_profile_id' => $profileB->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);

        $message = ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $memberA->id,
            'message_type' => 'text',
            'body' => 'Group message',
            'created_at' => now(),
        ]);

        // User A reacts with heart
        $this->withHeaders(['X-Device-Id' => $profileA->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions", [
                'emoji' => '❤️',
            ])->assertStatus(201);

        // User B reacts with heart
        $this->withHeaders(['X-Device-Id' => $profileB->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions", [
                'emoji' => '❤️',
            ])->assertStatus(201);

        // User A reacts with thumbs up
        $response = $this->withHeaders(['X-Device-Id' => $profileA->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions", [
                'emoji' => '👍',
            ]);

        $response->assertStatus(201);
        $data = $response->json('success.data');
        $this->assertEquals(2, $data['counts']['❤️']);
        $this->assertEquals(1, $data['counts']['👍']);
        $this->assertContains('❤️', $data['myReacted']);
        $this->assertContains('👍', $data['myReacted']);
    }

    public function test_duplicate_reaction_is_idempotent(): void
    {
        [$circle, $member, $profile] = $this->createCircleWithMember('device-react-005');

        $message = ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'message_type' => 'text',
            'body' => 'Dup test',
            'created_at' => now(),
        ]);

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions", ['emoji' => '🔥'])
            ->assertStatus(201);

        // Same reaction again should still succeed (idempotent)
        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson("/api/chat/messages/{$message->id}/reactions", ['emoji' => '🔥']);

        $response->assertStatus(201);
        $data = $response->json('success.data');
        $this->assertEquals(1, $data['counts']['🔥']);
    }

    public function test_non_member_cannot_react(): void
    {
        [$circle, $member] = $this->createCircleWithMember('device-react-006');

        $message = ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'message_type' => 'text',
            'body' => 'No access',
            'created_at' => now(),
        ]);

        // Create outsider
        $outsider = User::factory()->create();
        MeProfile::create([
            'device_id' => 'device-outsider',
            'nickname' => 'Outsider',
            'initial' => 'O',
            'user_id' => $outsider->id,
        ]);

        $response = $this->withHeaders(['X-Device-Id' => 'device-outsider'])
            ->postJson("/api/chat/messages/{$message->id}/reactions", ['emoji' => '❤️']);

        $response->assertStatus(403);
    }

    public function test_message_fetch_includes_reactions(): void
    {
        [$circle, $member, $profile] = $this->createCircleWithMember('device-react-007');

        $message = ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'message_type' => 'text',
            'body' => 'With reactions',
            'created_at' => now(),
        ]);

        MessageReaction::create([
            'message_id' => $message->id,
            'user_id' => $profile->user_id,
            'emoji' => '🎉',
            'created_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson("/api/circles/{$circle->id}/chat/messages");

        $response->assertStatus(200);
        $items = $response->json('success.data');
        $chatMsg = collect($items)->first(fn ($item) => str_starts_with($item['id'], 'cm_'));
        $this->assertNotNull($chatMsg);
        $this->assertArrayHasKey('reactions', $chatMsg);
        $this->assertEquals(1, $chatMsg['reactions']['counts']['🎉']);
        $this->assertContains('🎉', $chatMsg['reactions']['myReacted']);
    }
}
