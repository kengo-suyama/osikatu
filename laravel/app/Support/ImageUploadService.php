<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUploadService
{
    private static function publicUrlFromPath(string $path): string
    {
        return '/storage/' . ltrim($path, '/');
    }

    public static function storePublicImage(UploadedFile $file, string $dir): array
    {
        $mime = $file->getMimeType();
        $extension = self::extensionFromMime($mime);
        if ($extension === null) {
            return [
                'error' => [
                    'code' => 'UNSUPPORTED_IMAGE_TYPE',
                    'message' => '対応していない画像形式です。',
                ],
            ];
        }

        $directory = trim($dir, '/');
        Storage::disk('public')->makeDirectory($directory);

        $filename = Str::uuid()->toString() . '.' . $extension;
        $path = $directory . '/' . $filename;
        $fullPath = Storage::disk('public')->path($path);

        if (!extension_loaded('gd') && !extension_loaded('imagick')) {
            $storedPath = $file->storeAs($directory, $filename, 'public');
            $url = self::publicUrlFromPath($storedPath);

            return [
                'path' => $storedPath,
                'url' => $url,
                'width' => null,
                'height' => null,
                'sizeBytes' => $file->getSize() ?: null,
            ];
        }

        $result = extension_loaded('gd')
            ? self::processWithGd($file->getRealPath(), $mime, $fullPath)
            : self::processWithImagick($file->getRealPath(), $fullPath, $extension);

        if (isset($result['error'])) {
            $storedPath = $file->storeAs($directory, $filename, 'public');
            $url = self::publicUrlFromPath($storedPath);

            return [
                'path' => $storedPath,
                'url' => $url,
                'width' => null,
                'height' => null,
                'sizeBytes' => $file->getSize() ?: null,
            ];
        }

        $url = self::publicUrlFromPath($path);

        return [
            'path' => $path,
            'url' => $url,
            'width' => $result['width'] ?? null,
            'height' => $result['height'] ?? null,
            'sizeBytes' => $result['sizeBytes'] ?? null,
        ];
    }

    private static function extensionFromMime(?string $mime): ?string
    {
        return match ($mime) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => null,
        };
    }

    private static function processWithGd(string $sourcePath, string $mime, string $outputPath): array
    {
        $source = match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($sourcePath),
            'image/png' => @imagecreatefrompng($sourcePath),
            'image/webp' => @imagecreatefromwebp($sourcePath),
            default => false,
        };

        if (!$source) {
            return [
                'error' => [
                    'code' => 'IMAGE_PROCESS_FAILED',
                    'message' => '画像の読み込みに失敗しました。',
                ],
            ];
        }

        $width = imagesx($source);
        $height = imagesy($source);

        $maxEdge = 1600;
        $scale = 1.0;
        $longEdge = max($width, $height);
        if ($longEdge > $maxEdge) {
            $scale = $maxEdge / $longEdge;
        }

        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        if (in_array($mime, ['image/png', 'image/webp'], true)) {
            imagealphablending($target, false);
            imagesavealpha($target, true);
        }

        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $width,
            $height
        );

        $saved = match ($mime) {
            'image/jpeg', 'image/jpg' => imagejpeg($target, $outputPath, 85),
            'image/png' => imagepng($target, $outputPath),
            'image/webp' => imagewebp($target, $outputPath, 85),
            default => false,
        };

        imagedestroy($source);
        imagedestroy($target);

        if (!$saved) {
            return [
                'error' => [
                    'code' => 'IMAGE_PROCESS_FAILED',
                    'message' => '画像の保存に失敗しました。',
                ],
            ];
        }

        return [
            'width' => $targetWidth,
            'height' => $targetHeight,
            'sizeBytes' => filesize($outputPath) ?: null,
        ];
    }

    private static function processWithImagick(string $sourcePath, string $outputPath, string $extension): array
    {
        if (!class_exists(\Imagick::class)) {
            return [
                'error' => [
                    'code' => 'IMAGE_PROCESSOR_UNAVAILABLE',
                    'message' => '画像処理が利用できません。',
                ],
            ];
        }

        $imagick = new \Imagick();
        $imagick->readImage($sourcePath);
        $imagick->stripImage();

        $width = $imagick->getImageWidth();
        $height = $imagick->getImageHeight();

        $maxEdge = 1600;
        $longEdge = max($width, $height);
        if ($longEdge > $maxEdge) {
            $scale = $maxEdge / $longEdge;
            $imagick->thumbnailImage((int) round($width * $scale), (int) round($height * $scale), true);
        }

        $imagick->setImageFormat($extension);
        $imagick->writeImage($outputPath);
        $imagick->clear();
        $imagick->destroy();

        return [
            'width' => isset($scale) ? (int) round($width * $scale) : $width,
            'height' => isset($scale) ? (int) round($height * $scale) : $height,
            'sizeBytes' => filesize($outputPath) ?: null,
        ];
    }
}
