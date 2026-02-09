<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserHomeMedia;
use App\Support\ApiResponse;
use App\Support\ImageUploadService;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class MeHomeMediaController extends Controller
{
    public function show(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $item = UserHomeMedia::query()->where('user_id', $user->id)->first();
        return ApiResponse::success([
            'item' => $item ? $this->map($item) : null,
        ]);
    }

    public function store(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $validator = Validator::make($request->all(), [
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4', 'max:20480'],
        ]);
        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $file = $request->file('file');
        if (!$file) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'file' => ['Media file is required.'],
            ], 422);
        }

        $existing = UserHomeMedia::query()->where('user_id', $user->id)->first();

        $stored = $this->storeMediaFile($file);
        if (isset($stored['error'])) {
            return ApiResponse::error(
                $stored['error']['code'] ?? 'MEDIA_UPLOAD_FAILED',
                $stored['error']['message'] ?? 'Media upload failed.',
                null,
                422
            );
        }

        if ($existing && $existing->path) {
            Storage::disk('public')->delete($existing->path);
        }

        $item = UserHomeMedia::updateOrCreate(
            ['user_id' => $user->id],
            [
                'type' => $stored['type'] ?? 'image',
                'path' => $stored['path'],
                'mime' => $stored['mime'] ?? null,
                'size_bytes' => $stored['sizeBytes'] ?? null,
                'width' => $stored['width'] ?? null,
                'height' => $stored['height'] ?? null,
            ]
        );

        return ApiResponse::success([
            'item' => $this->map($item),
        ], null, 201);
    }

    private function resolveUser(Request $request): ?User
    {
        $deviceId = (string) $request->header('X-Device-Id', '');
        $deviceId = trim($deviceId);
        if ($deviceId === '') {
            return null;
        }

        $profile = MeProfileResolver::resolve($deviceId);
        $userId = $profile?->user_id;
        if (!$userId) {
            return null;
        }

        return User::query()->find($userId);
    }

    private function storeMediaFile(\Illuminate\Http\UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?? '';
        if (str_starts_with($mime, 'video/')) {
            $directory = 'home-media';
            Storage::disk('public')->makeDirectory($directory);
            $extension = $file->getClientOriginalExtension() ?: 'mp4';
            $filename = Str::uuid()->toString() . '.' . $extension;
            $path = $file->storeAs($directory, $filename, 'public');
            $url = '/storage/' . ltrim($path, '/');

            return [
                'type' => 'video',
                'path' => $path,
                'url' => $url,
                'mime' => $mime ?: null,
                'sizeBytes' => $file->getSize() ?: null,
            ];
        }

        $stored = ImageUploadService::storePublicImage($file, 'home-media');
        if (isset($stored['error'])) {
            return $stored;
        }

        return [
            'type' => 'image',
            'path' => $stored['path'],
            'url' => $stored['url'],
            'mime' => $mime ?: null,
            'sizeBytes' => $stored['sizeBytes'] ?? null,
            'width' => $stored['width'] ?? null,
            'height' => $stored['height'] ?? null,
        ];
    }

    private function map(UserHomeMedia $item): array
    {
        return [
            'type' => $item->type,
            'url' => '/storage/' . ltrim($item->path, '/'),
            'mime' => $item->mime,
            'sizeBytes' => $item->size_bytes,
            'width' => $item->width,
            'height' => $item->height,
            'updatedAt' => $item->updated_at?->toIso8601String(),
        ];
    }
}
