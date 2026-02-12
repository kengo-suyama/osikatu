<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatMessageSenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_index_includes_currentTitleId_in_author(): void
    {
        $user = User::factory()->create([
            'current_title_id' => 'title_epic_01',
        ]);

        $profile = MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'device-sender-test',
            'nickname' => 'Tester',
        ]);

        $circle = Circle::factory()->create();

        $member = CircleMember::create([
            'circle_id' => $circle->id,
            'me_profile_id' => $profile->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'message_type' => 'text',
            'body' => 'Hello sender test',
            'created_at' => now(),
        ]);

        $response = $this->getJson("/api/circles/{$circle->id}/chat/messages", [
            'X-Device-Id' => 'device-sender-test',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertNotEmpty($data);

        $msg = $data[0];
        $this->assertEquals('Tester', $msg['author']['name']);
        $this->assertEquals('title_epic_01', $msg['author']['currentTitleId']);
    }
}
