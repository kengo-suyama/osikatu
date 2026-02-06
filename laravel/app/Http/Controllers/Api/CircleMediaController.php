<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CircleMedia;
use App\Models\CircleMember;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\Entitlements;
use App\Support\ImageUploadService;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CircleMediaController extends Controller
{
    public function index(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $items = CircleMedia::query()
            ->where('circle_id', $circle)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return ApiResponse::success([
            'items' => $items->map(fn (CircleMedia $media) => $this->mapMedia($media))->values(),
        ]);
    }

    public function show(Request $request, int $circle, int $media)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $item = CircleMedia::query()
            ->where('circle_id', $circle)
            ->where('id', $media)
            ->first();

        if (!$item) {
            return ApiResponse::error('NOT_FOUND', 'Media not found.', null, 404);
        }

        return ApiResponse::success($this->mapMedia($item));
    }

    public function store(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = User::query()->find(CurrentUser::id());
        if ($user) {
            $currentCount = CircleMedia::query()
                ->where('circle_id', $circle)
                ->count();

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
        }

        $validator = Validator::make($request->all(), [
            'caption' => ['nullable', 'string', 'max:200'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $file = $request->file('file');

        if (!$file) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'file' => ['Media file is required.'],
            ], 422);
        }

        $mime = $file->getMimeType() ?? '';
        if (str_starts_with($mime, 'video/') && $user && !Entitlements::canUploadAlbumVideo($user)) {
            return ApiResponse::error(
                'FEATURE_NOT_AVAILABLE',
                '動画アップロードはPlus/Premium限定です。',
                ['plan' => $user->plan ?? 'free'],
                403
            );
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

        $media = CircleMedia::create([
            'circle_id' => $circle,
            'created_by_member_id' => $member->id,
            'type' => $stored['type'] ?? 'image',
            'path' => $stored['path'],
            'url' => $stored['url'],
            'mime' => $stored['mime'] ?? null,
            'size_bytes' => $stored['sizeBytes'] ?? null,
            'width' => $stored['width'] ?? null,
            'height' => $stored['height'] ?? null,
            'caption' => $data['caption'] ?? null,
            'created_at' => now(),
        ]);

        return ApiResponse::success($this->mapMedia($media), null, 201);
    }

    public function destroy(Request $request, int $circle, int $media)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $item = CircleMedia::query()
            ->where('circle_id', $circle)
            ->where('id', $media)
            ->first();

        if (!$item) {
            return ApiResponse::error('NOT_FOUND', 'Media not found.', null, 404);
        }

        $isManager = in_array($member->role, ['owner', 'admin'], true);
        if (!$isManager && (int) $item->created_by_member_id !== (int) $member->id) {
            return ApiResponse::error('FORBIDDEN', 'Only owner or uploader can delete.', null, 403);
        }

        if ($item->path) {
            Storage::disk('public')->delete($item->path);
        }

        $item->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    private function resolveMember(int $circleId, Request $request): ?CircleMember
    {
        $deviceId = $request->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            if ($profile) {
                $member = CircleMember::query()
                    ->where('circle_id', $circleId)
                    ->where('me_profile_id', $profile->id)
                    ->first();
                if ($member) {
                    return $member;
                }
            }
        }

        return CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', CurrentUser::id())
            ->first();
    }

    private function storeMediaFile(\Illuminate\Http\UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?? '';
        if (str_starts_with($mime, 'video/')) {
            $directory = 'circle-media';
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

        $stored = ImageUploadService::storePublicImage($file, 'circle-media');
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

    private function mapMedia(CircleMedia $media): array
    {
        return [
            'id' => $media->id,
            'circleId' => $media->circle_id,
            'type' => $media->type,
            'url' => $media->url,
            'mime' => $media->mime,
            'sizeBytes' => $media->size_bytes,
            'width' => $media->width,
            'height' => $media->height,
            'caption' => $media->caption,
            'createdAt' => $media->created_at?->toIso8601String(),
        ];
    }
}
