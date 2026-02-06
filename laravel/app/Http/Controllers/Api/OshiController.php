<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOshiRequest;
use App\Http\Requests\UpdateOshiRequest;
use App\Http\Resources\OshiResource;
use App\Models\Oshi;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\ImageUploadService;
use App\Support\OperationLogService;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OshiController extends Controller
{
    public function index(Request $request)
    {
        $oshis = Oshi::query()
            ->where('user_id', CurrentUser::id())
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success(OshiResource::collection($oshis));
    }

    public function store(StoreOshiRequest $request)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $count = Oshi::query()
            ->where('user_id', $user->id)
            ->count();

        if (!PlanGate::hasPremium($user) && $count >= 1) {
            return ApiResponse::error('PLAN_LIMIT', 'Free plan allows only 1 oshi.', [
                'limit' => 1,
                'current' => $count,
            ], 403);
        }

        $payload = $this->mapOshiPayload($request->validated());

        if ($count === 0) {
            $payload['is_primary'] = true;
        }

        $oshi = Oshi::create($payload + ['user_id' => CurrentUser::id()]);

        return ApiResponse::success(new OshiResource($oshi), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        return ApiResponse::success(new OshiResource($oshi));
    }

    public function update(UpdateOshiRequest $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $validated = $request->validated();
        if (array_key_exists('imageFrameId', $validated)) {
            $user = User::query()->find(CurrentUser::id());
            if (!$user) {
                return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
            }
            $frameId = $validated['imageFrameId'];
            if ($frameId !== null && $frameId !== '' && !PlanGate::isFrameAllowed($user, $frameId)) {
                return ApiResponse::error(
                    'FRAME_LOCKED',
                    'Selected frame is not available on current plan.',
                    ['allowed' => PlanGate::allowedFrameIds($user)],
                    422
                );
            }
        }

        $payload = $this->mapOshiPayload($validated);
        $oshi->update($payload);

        if (array_key_exists('image_frame_id', $payload)) {
            OperationLogService::log($request, 'oshi_media.change_frame', null, [
                'frameId' => $payload['image_frame_id'],
            ]);
        }

        return ApiResponse::success(new OshiResource($oshi));
    }

    public function uploadImage(Request $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'image' => ['required', 'image', 'max:5120'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $file = $request->file('image');
        $stored = ImageUploadService::storePublicImage($file, 'oshis');
        if (isset($stored['error'])) {
            return ApiResponse::error(
                $stored['error']['code'] ?? 'IMAGE_PROCESS_FAILED',
                $stored['error']['message'] ?? 'Image upload failed.',
                null,
                422
            );
        }

        $oshi->update(['image_path' => $stored['path']]);

        return ApiResponse::success(new OshiResource($oshi));
    }

    public function makePrimary(Request $request, int $id)
    {
        $userId = CurrentUser::id();

        $oshi = Oshi::query()
            ->where('user_id', $userId)
            ->findOrFail($id);

        DB::transaction(function () use ($userId, $oshi) {
            Oshi::query()
                ->where('user_id', $userId)
                ->where('is_primary', true)
                ->update(['is_primary' => false]);

            $oshi->update(['is_primary' => true]);
        });

        $oshi->refresh();

        return ApiResponse::success(new OshiResource($oshi));
    }

    public function destroy(Request $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $oshi->delete();

        return ApiResponse::success(null);
    }

    private function mapOshiPayload(array $data): array
    {
        $payload = [];
        if (array_key_exists('name', $data)) {
            $payload['name'] = $data['name'];
        }
        if (array_key_exists('category', $data)) {
            $payload['category'] = $data['category'];
        }
        if (array_key_exists('accentColor', $data)) {
            $payload['color'] = $data['accentColor'];
        }
        if (array_key_exists('memo', $data)) {
            $payload['memo'] = $data['memo'];
        }
        if (array_key_exists('imageFrameId', $data)) {
            $payload['image_frame_id'] = $data['imageFrameId'] ?: null;
        }
        return $payload;
    }
}
