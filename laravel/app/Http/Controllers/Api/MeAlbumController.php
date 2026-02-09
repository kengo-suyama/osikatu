<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserAlbum;
use App\Support\ApiResponse;
use App\Support\Entitlements;
use App\Support\ImageUploadService;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class MeAlbumController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $items = UserAlbum::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return ApiResponse::success([
            'items' => $items->map(fn (UserAlbum $album) => $this->map($album))->values(),
        ]);
    }

    public function show(Request $request, int $album)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $item = UserAlbum::query()
            ->where('user_id', $user->id)
            ->where('id', $album)
            ->first();

        if (!$item) {
            return ApiResponse::error('NOT_FOUND', 'Album entry not found.', null, 404);
        }

        return ApiResponse::success($this->map($item));
    }

    public function store(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $validator = Validator::make($request->all(), [
            'date' => ['nullable', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:1000'],
            'files' => ['nullable', 'array', 'max:8'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,webp,mp4', 'max:10240'],
        ]);
        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $note = is_string($data['note'] ?? null) ? trim((string) $data['note']) : '';
        $date = is_string($data['date'] ?? null) ? (string) $data['date'] : null;

        $files = $request->file('files', []);
        if ($files instanceof UploadedFile) {
            $files = [$files];
        }
        if (!is_array($files)) {
            $files = [];
        }

        if ($note === '' && count($files) === 0) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'note' => ['note or files are required.'],
            ], 422);
        }

        $currentCount = UserAlbum::query()->where('user_id', $user->id)->count();
        if (!Entitlements::canAddAlbum($user, $currentCount)) {
            $quotas = Entitlements::quotas($user);
            return ApiResponse::error(
                'QUOTA_EXCEEDED',
                'アルバムの上限に達しました。',
                [
                    'limit' => $quotas['albumMax'],
                    'current' => $currentCount,
                    'plan' => $user->plan ?? 'free',
                ],
                403
            );
        }

        foreach ($files as $file) {
            $mime = $file instanceof UploadedFile ? ($file->getMimeType() ?? '') : '';
            if (str_starts_with($mime, 'video/') && !Entitlements::canUploadAlbumVideo($user)) {
                return ApiResponse::error(
                    'FEATURE_NOT_AVAILABLE',
                    '動画アップロードはPlus/Premium限定です。',
                    ['plan' => $user->plan ?? 'free'],
                    403
                );
            }
        }

        $media = [];
        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) {
                continue;
            }

            $stored = $this->storeMediaFile($file);
            if (isset($stored['error'])) {
                return ApiResponse::error(
                    $stored['error']['code'] ?? 'MEDIA_UPLOAD_FAILED',
                    $stored['error']['message'] ?? 'Media upload failed.',
                    null,
                    422
                );
            }

            $media[] = [
                'id' => Str::uuid()->toString(),
                'type' => $stored['type'] ?? 'image',
                'path' => $stored['path'],
                'url' => $stored['url'],
                'name' => $file->getClientOriginalName() ?: null,
                'mime' => $stored['mime'] ?? null,
                'sizeBytes' => $stored['sizeBytes'] ?? null,
                'width' => $stored['width'] ?? null,
                'height' => $stored['height'] ?? null,
            ];
        }

        $album = UserAlbum::create([
            'user_id' => $user->id,
            'date' => $date,
            'note' => $note !== '' ? $note : null,
            'media' => $media,
        ]);

        return ApiResponse::success($this->map($album), null, 201);
    }

    public function destroy(Request $request, int $album)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $item = UserAlbum::query()
            ->where('user_id', $user->id)
            ->where('id', $album)
            ->first();

        if (!$item) {
            return ApiResponse::error('NOT_FOUND', 'Album entry not found.', null, 404);
        }

        $media = is_array($item->media) ? $item->media : [];
        foreach ($media as $m) {
            $path = is_array($m) ? ($m['path'] ?? null) : null;
            if (is_string($path) && $path !== '') {
                Storage::disk('public')->delete($path);
            }
        }

        $item->delete();

        return ApiResponse::success(['deleted' => true]);
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

    private function storeMediaFile(UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?? '';
        if (str_starts_with($mime, 'video/')) {
            $directory = 'user-album';
            Storage::disk('public')->makeDirectory($directory);
            $extension = $file->getClientOriginalExtension() ?: 'mp4';
            $filename = Str::uuid()->toString() . '.' . $extension;
            $path = $file->storeAs($directory, $filename, 'public');
            $url = Storage::disk('public')->url($path);

            return [
                'type' => 'video',
                'path' => $path,
                'url' => $url,
                'mime' => $mime ?: null,
                'sizeBytes' => $file->getSize() ?: null,
            ];
        }

        $stored = ImageUploadService::storePublicImage($file, 'user-album');
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

    private function map(UserAlbum $album): array
    {
        $media = is_array($album->media) ? $album->media : [];
        $mapped = [];
        foreach ($media as $m) {
            if (!is_array($m)) {
                continue;
            }
            $mapped[] = [
                'id' => is_string($m['id'] ?? null) ? $m['id'] : Str::uuid()->toString(),
                'type' => is_string($m['type'] ?? null) ? $m['type'] : 'image',
                'url' => is_string($m['url'] ?? null) ? $m['url'] : null,
                'name' => is_string($m['name'] ?? null) ? $m['name'] : null,
                'mime' => is_string($m['mime'] ?? null) ? $m['mime'] : null,
                'sizeBytes' => is_int($m['sizeBytes'] ?? null) ? $m['sizeBytes'] : null,
                'width' => is_int($m['width'] ?? null) ? $m['width'] : null,
                'height' => is_int($m['height'] ?? null) ? $m['height'] : null,
            ];
        }

        return [
            'id' => $album->id,
            'date' => $album->date,
            'note' => $album->note,
            'media' => $mapped,
            'createdAt' => $album->created_at?->toIso8601String(),
        ];
    }
}

