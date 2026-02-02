<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\OperationLog;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChatMessagesTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId): array
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'テストサークル',
            'description' => 'チャットテスト',
            'oshi_label' => '推し',
            'oshi_tag' => 'test',
            'oshi_tags' => ['test'],
            'is_public' => true,
            'plan' => 'plus',
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

    public function test_member_can_list_chat_messages_with_mixed_sources(): void
    {
        [$circle, $member] = $this->createCircleWithMember('device-test-001');

        ChatMessage::create([
            'circle_id' => $circle->id,
            'sender_member_id' => $member->id,
            'body' => '新チャット',
            'created_at' => now()->subMinutes(5),
        ]);

        $legacy = Post::create([
            'circle_id' => $circle->id,
            'author_member_id' => $member->id,
            'user_id' => $member->user_id,
            'post_type' => 'chat',
            'body' => '旧チャット',
            'tags' => [],
            'is_pinned' => false,
            'like_count' => 0,
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-test-001',
        ])->getJson("/api/circles/{$circle->id}/chat/messages");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success' => [
                    'data' => [
                        '*' => ['id', 'source', 'user', 'imageUrl', 'deletedAt'],
                    ],
                ],
            ]);

        $items = $response->json('success.data');
        $ids = array_column($items, 'id');

        $this->assertTrue(collect($ids)->contains(fn ($id) => str_starts_with((string) $id, 'cm_')));
        $this->assertTrue(collect($ids)->contains(fn ($id) => str_starts_with((string) $id, 'lg_')));
    }

    public function test_non_member_is_forbidden(): void
    {
        [$circle] = $this->createCircleWithMember('device-test-002');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-nonmember',
        ])->getJson("/api/circles/{$circle->id}/chat/messages");

        $response->assertStatus(403);
    }

    public function test_can_post_text_and_image_chat_messages(): void
    {
        Storage::fake('public');
        [$circle] = $this->createCircleWithMember('device-test-003');

        $textResponse = $this->withHeaders([
            'X-Device-Id' => 'device-test-003',
        ])->postJson("/api/circles/{$circle->id}/chat/messages", [
            'body' => 'テキストのみ',
        ]);

        $textResponse->assertStatus(201)
            ->assertJsonPath('success.data.postType', 'chat');

        $file = UploadedFile::fake()->image('photo.jpg', 1200, 800);
        $imageResponse = $this->withHeaders([
            'X-Device-Id' => 'device-test-003',
        ])->post("/api/circles/{$circle->id}/chat/messages", [
            'image' => $file,
        ]);

        $imageResponse->assertStatus(201);
        $this->assertDatabaseCount('chat_message_media', 1);
    }

    public function test_operation_logs_created_on_chat_create_and_delete(): void
    {
        [$circle] = $this->createCircleWithMember('device-test-004');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-test-004',
        ])->postJson("/api/circles/{$circle->id}/chat/messages", [
            'body' => 'ログ確認',
        ]);

        $response->assertStatus(201);

        $data = $response->json('success.data');
        $rawId = $data['id'];
        $id = (int) str_replace('cm_', '', (string) $rawId);

        $this->assertDatabaseHas('operation_logs', [
            'action' => 'chat_message.create',
            'circle_id' => $circle->id,
        ]);

        $delete = $this->withHeaders([
            'X-Device-Id' => 'device-test-004',
        ])->deleteJson("/api/circles/{$circle->id}/chat/messages/{$id}");

        $delete->assertStatus(200);

        $this->assertDatabaseHas('operation_logs', [
            'action' => 'chat_message.delete',
            'circle_id' => $circle->id,
        ]);

        $log = OperationLog::query()->where('action', 'chat_message.create')->first();
        $meta = $log?->meta ?? [];
        $this->assertIsArray($meta);
        $this->assertArrayNotHasKey('body', $meta);
    }
}
