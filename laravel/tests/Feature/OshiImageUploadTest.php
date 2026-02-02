<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OshiImageUploadTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Oshi',
            'initial' => 'O',
        ]);
    }

    public function test_can_upload_oshi_image(): void
    {
        Storage::fake('public');

        $profile = $this->createProfile('device-oshi-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Test Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->post("/api/oshis/{$oshi->id}/image", [
                'image' => UploadedFile::fake()->image('oshi.png', 200, 200),
            ]);

        $imageUrl = $response->json('success.data.imageUrl');
        $response->assertStatus(200)
            ->assertJsonPath('success.data.id', $oshi->id);

        $this->assertNotEmpty($imageUrl);
    }
}
