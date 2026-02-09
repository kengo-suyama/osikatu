<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaStorage
{
    public static function store(UploadedFile $file, string $directory = 'media'): string
    {
        $disk = self::disk();
        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $filename = Str::uuid() . '.' . $extension;
        $path = $directory . '/' . $filename;

        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }

    public static function url(string $path): string
    {
        return Storage::disk(self::disk())->url($path);
    }

    public static function delete(string $path): bool
    {
        return Storage::disk(self::disk())->delete($path);
    }

    public static function exists(string $path): bool
    {
        return Storage::disk(self::disk())->exists($path);
    }

    public static function disk(): string
    {
        $disk = config('filesystems.media_disk');
        return is_string($disk) && $disk !== '' ? $disk : 'public';
    }
}
