<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MeHomeMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_and_get_home_media_image(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-home-media-001',
            'nickname' => 'Home',
            'initial' => 'H',
            'user_id' => $user->id,
        ]);

        $file = UploadedFile::fake()->image('home.jpg', 800, 450)->size(200);

        $upload = $this->withHeaders(['X-Device-Id' => 'dev-home-media-001'])
            ->post('/api/me/media/home', [
                'file' => $file,
            ]);

        $upload->assertStatus(201)
            ->assertJsonPath('success.data.item.type', 'image')
            ->assertJsonPath('success.data.item.width', 800)
            ->assertJsonPath('success.data.item.height', 450);

        $get = $this->withHeaders(['X-Device-Id' => 'dev-home-media-001'])
            ->getJson('/api/me/media/home');

        $get->assertStatus(200)
            ->assertJsonPath('success.data.item.type', 'image');
    }

    public function test_upload_home_media_video(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-home-media-002',
            'nickname' => 'Home',
            'initial' => 'H',
            'user_id' => $user->id,
        ]);

        $file = UploadedFile::fake()->create('home.mp4', 1000, 'video/mp4');

        $upload = $this->withHeaders(['X-Device-Id' => 'dev-home-media-002'])
            ->post('/api/me/media/home', [
                'file' => $file,
            ]);

        $upload->assertStatus(201)
            ->assertJsonPath('success.data.item.type', 'video')
            ->assertJsonPath('success.data.item.mime', 'video/mp4');
    }

    public function test_get_returns_null_when_not_uploaded(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-home-media-003',
            'nickname' => 'Home',
            'initial' => 'H',
            'user_id' => $user->id,
        ]);

        $get = $this->withHeaders(['X-Device-Id' => 'dev-home-media-003'])
            ->getJson('/api/me/media/home');

        $get->assertStatus(200)
            ->assertJsonPath('success.data.item', null);
    }
}
