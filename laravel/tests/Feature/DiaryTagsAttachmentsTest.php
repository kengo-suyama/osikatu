<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Diary;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DiaryTagsAttachmentsTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'DiaryTags',
            'initial' => 'T',
        ]);
    }

    public function test_store_with_tags(): void
    {
        $profile = $this->createProfile('device-tag-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Tag Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/diaries', [
                'oshiId' => $oshi->id,
                'title' => 'Tagged log',
                'content' => 'Live report',
                'diaryDate' => '2026-02-07',
                'tags' => ['live', 'unbox'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success.data.tags', ['live', 'unbox']);

        $this->assertDatabaseHas('diaries', ['title' => 'Tagged log']);
    }

    public function test_store_with_images(): void
    {
        Storage::fake('public');

        $profile = $this->createProfile('device-img-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Image Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->post('/api/me/diaries', [
                'oshiId' => $oshi->id,
                'title' => 'Image log',
                'content' => 'With photo',
                'diaryDate' => '2026-02-07',
                'images' => [
                    UploadedFile::fake()->image('photo1.jpg', 200, 200),
                ],
            ]);

        $response->assertStatus(201);
        $data = $response->json('success.data');
        $this->assertCount(1, $data['attachments']);
        $this->assertEquals('image', $data['attachments'][0]['fileType']);
        $this->assertNotEmpty($data['attachments'][0]['url']);
        $this->assertDatabaseCount('attachments', 1);
    }

    public function test_store_with_tags_and_images(): void
    {
        Storage::fake('public');

        $profile = $this->createProfile('device-both-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Both Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->post('/api/me/diaries', [
                'oshiId' => $oshi->id,
                'title' => 'Full log',
                'content' => 'Tags and images',
                'diaryDate' => '2026-02-07',
                'tags' => ['live', 'travel'],
                'images' => [
                    UploadedFile::fake()->image('a.png', 100, 100),
                    UploadedFile::fake()->image('b.webp', 100, 100),
                ],
            ]);

        $response->assertStatus(201);
        $data = $response->json('success.data');
        $this->assertEquals(['live', 'travel'], $data['tags']);
        $this->assertCount(2, $data['attachments']);
    }

    public function test_index_filter_by_tag(): void
    {
        $profile = $this->createProfile('device-filter-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Filter Oshi',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Live diary',
            'content' => 'Concert',
            'diary_date' => '2026-02-07',
            'tags' => ['live', 'concert'],
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Unbox diary',
            'content' => 'Goods',
            'diary_date' => '2026-02-06',
            'tags' => ['unbox'],
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/diaries?tag=live');

        $response->assertStatus(200);
        $items = $response->json('success.data');
        $this->assertCount(1, $items);
        $this->assertEquals('Live diary', $items[0]['title']);
    }

    public function test_index_filter_by_keyword(): void
    {
        $profile = $this->createProfile('device-q-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Keyword Oshi',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Live report',
            'content' => 'Great show',
            'diary_date' => '2026-02-07',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Random note',
            'content' => 'Goods unbox',
            'diary_date' => '2026-02-06',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/diaries?q=Live');

        $response->assertStatus(200);
        $items = $response->json('success.data');
        $this->assertCount(1, $items);
        $this->assertEquals('Live report', $items[0]['title']);
    }

    public function test_index_returns_attachments(): void
    {
        $profile = $this->createProfile('device-idx-att-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Index Oshi',
        ]);

        $diary = Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Attachment test',
            'content' => 'Check images',
            'diary_date' => '2026-02-07',
        ]);

        Attachment::create([
            'user_id' => $profile->user_id,
            'related_type' => Diary::class,
            'related_id' => $diary->id,
            'file_path' => 'diaries/test.jpg',
            'file_type' => 'image',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/diaries');

        $response->assertStatus(200);
        $items = $response->json('success.data');
        $this->assertCount(1, $items);
        $this->assertCount(1, $items[0]['attachments']);
        $this->assertEquals('image', $items[0]['attachments'][0]['fileType']);
    }

    public function test_index_filter_by_has_photo(): void
    {
        $profile = $this->createProfile('device-hasphoto-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'HasPhoto Oshi',
        ]);

        $withPhoto = Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'With photo',
            'content' => 'Has attachment',
            'diary_date' => '2026-02-07',
        ]);
        Attachment::create([
            'user_id' => $profile->user_id,
            'related_type' => Diary::class,
            'related_id' => $withPhoto->id,
            'file_path' => 'diaries/with.jpg',
            'file_type' => 'image',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'No photo',
            'content' => 'No attachment',
            'diary_date' => '2026-02-06',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/diaries?hasPhoto=true');

        $response->assertStatus(200);
        $items = $response->json('success.data');
        $this->assertCount(1, $items);
        $this->assertEquals('With photo', $items[0]['title']);
        $this->assertNotEmpty($items[0]['attachments'] ?? []);
    }

    public function test_show_returns_tags_and_attachments(): void
    {
        $profile = $this->createProfile('device-show-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Show Oshi',
        ]);

        $diary = Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Show Test',
            'content' => 'Detail test',
            'diary_date' => '2026-02-07',
            'tags' => ['test'],
        ]);

        Attachment::create([
            'user_id' => $profile->user_id,
            'related_type' => Diary::class,
            'related_id' => $diary->id,
            'file_path' => 'diaries/show.jpg',
            'file_type' => 'image',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson("/api/me/diaries/{$diary->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success.data.tags', ['test'])
            ->assertJsonCount(1, 'success.data.attachments');
    }

    public function test_update_tags(): void
    {
        $profile = $this->createProfile('device-upd-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Update Oshi',
        ]);

        $diary = Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'Update Test',
            'content' => 'Tags update test',
            'diary_date' => '2026-02-07',
            'tags' => ['old'],
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->putJson("/api/me/diaries/{$diary->id}", [
                'tags' => ['new', 'updated'],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success.data.tags', ['new', 'updated']);
    }

    public function test_store_without_tags_returns_empty_array(): void
    {
        $profile = $this->createProfile('device-notag-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'NoTag Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/diaries', [
                'oshiId' => $oshi->id,
                'title' => 'No tag log',
                'content' => 'Simple diary',
                'diaryDate' => '2026-02-07',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success.data.tags', []);
    }
}
