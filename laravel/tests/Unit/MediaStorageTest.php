<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\MediaStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaStorageTest extends TestCase
{
    public function test_store_saves_file_to_public_disk(): void
    {
        Storage::fake('public');
        config(['filesystems.media_disk' => 'public']);

        $file = UploadedFile::fake()->image('test.jpg', 100, 100);
        $path = MediaStorage::store($file, 'test-media');

        $this->assertStringStartsWith('test-media/', $path);
        $this->assertStringEndsWith('.jpg', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_delete_removes_file(): void
    {
        Storage::fake('public');
        config(['filesystems.media_disk' => 'public']);

        $file = UploadedFile::fake()->image('delete.png');
        $path = MediaStorage::store($file, 'test-media');

        $this->assertTrue(MediaStorage::exists($path));
        MediaStorage::delete($path);
        $this->assertFalse(MediaStorage::exists($path));
    }

    public function test_disk_defaults_to_public(): void
    {
        config(['filesystems.media_disk' => null]);
        $this->assertEquals('public', MediaStorage::disk());
    }
}
