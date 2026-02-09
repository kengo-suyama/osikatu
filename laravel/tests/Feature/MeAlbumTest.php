<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MeAlbumTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_list_show_delete_album_entry_with_image(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-album-001',
            'nickname' => 'Album',
            'initial' => 'A',
            'user_id' => $user->id,
        ]);

        $file = UploadedFile::fake()->image('album.jpg', 800, 450)->size(200);

        $create = $this->withHeaders(['X-Device-Id' => 'dev-album-001'])
            ->post('/api/me/album', [
                'date' => '2026-02-09',
                'note' => 'hello',
                'files' => [$file],
            ]);

        $create->assertStatus(201)
            ->assertJsonPath('success.data.note', 'hello')
            ->assertJsonPath('success.data.media.0.type', 'image');

        $id = $create->json('success.data.id');
        $this->assertNotNull($id);

        $list = $this->withHeaders(['X-Device-Id' => 'dev-album-001'])
            ->getJson('/api/me/album');

        $list->assertOk()
            ->assertJsonPath('success.data.items.0.id', $id);

        $show = $this->withHeaders(['X-Device-Id' => 'dev-album-001'])
            ->getJson("/api/me/album/{$id}");

        $show->assertOk()
            ->assertJsonPath('success.data.id', $id)
            ->assertJsonPath('success.data.media.0.type', 'image');

        $delete = $this->withHeaders(['X-Device-Id' => 'dev-album-001'])
            ->deleteJson("/api/me/album/{$id}");

        $delete->assertOk()
            ->assertJsonPath('success.data.deleted', true);

        $list2 = $this->withHeaders(['X-Device-Id' => 'dev-album-001'])
            ->getJson('/api/me/album');

        $list2->assertOk()
            ->assertJsonPath('success.data.items', []);
    }

    public function test_free_plan_cannot_upload_album_video(): void
    {
        Storage::fake('public');

        $user = User::factory()->create(['plan' => 'free']);
        MeProfile::create([
            'device_id' => 'dev-album-002',
            'nickname' => 'Album',
            'initial' => 'A',
            'user_id' => $user->id,
        ]);

        $file = UploadedFile::fake()->create('album.mp4', 1000, 'video/mp4');

        $res = $this->withHeaders(['X-Device-Id' => 'dev-album-002'])
            ->post('/api/me/album', [
                'note' => 'video',
                'files' => [$file],
            ]);

        $res->assertStatus(403)
            ->assertJsonPath('error.code', 'FEATURE_NOT_AVAILABLE');
    }
}

