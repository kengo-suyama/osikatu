<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDiaryRequest;
use App\Http\Requests\UpdateDiaryRequest;
use App\Http\Resources\DiaryResource;
use App\Models\Attachment;
use App\Models\Diary;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\ImageUploadService;
use Illuminate\Http\Request;

class DiaryController extends Controller
{
    public function index(Request $request)
    {
        $query = Diary::query()
            ->with('attachments')
            ->where('user_id', CurrentUser::id());

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $tag = $request->query('tag');
        if (!empty($tag)) {
            $driver = $query->getConnection()->getDriverName();
            if ($driver === 'sqlite') {
                $query->whereRaw(
                    "EXISTS (SELECT 1 FROM json_each(diaries.tags) WHERE json_each.value = ?)",
                    [$tag]
                );
            } else {
                $query->whereJsonContains('tags', $tag);
            }
        }

        $hasPhotoRaw = $request->query('hasPhoto');
        if ($hasPhotoRaw !== null && $hasPhotoRaw !== '') {
            $hasPhoto = filter_var($hasPhotoRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($hasPhoto === true) {
                $query->whereHas('attachments', function ($sub) {
                    $sub->where('file_type', 'image');
                });
            } elseif ($hasPhoto === false) {
                $query->whereDoesntHave('attachments', function ($sub) {
                    $sub->where('file_type', 'image');
                });
            }
        }

        $q = $request->query('q');
        if (!empty($q)) {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('content', 'like', "%{$q}%");
            });
        }

        $diaries = $query->orderByDesc('diary_date')->get();

        return ApiResponse::success(DiaryResource::collection($diaries));
    }

    public function store(StoreDiaryRequest $request)
    {
        $validated = $request->validated();

        $imageFiles = $request->file('images', []);

        $diary = Diary::create(
            collect($validated)->except(['images'])->toArray() + [
                'user_id' => CurrentUser::id(),
            ]
        );

        if (is_array($imageFiles)) {
            foreach ($imageFiles as $file) {
                $stored = ImageUploadService::storePublicImage($file, 'diaries');
                if (isset($stored['error'])) {
                    continue;
                }
                Attachment::create([
                    'user_id' => CurrentUser::id(),
                    'related_type' => Diary::class,
                    'related_id' => $diary->id,
                    'file_path' => $stored['path'],
                    'file_type' => 'image',
                ]);
            }
        }

        $diary->load('attachments');

        return ApiResponse::success(new DiaryResource($diary), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $diary = Diary::query()
            ->with('attachments')
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        return ApiResponse::success(new DiaryResource($diary));
    }

    public function update(UpdateDiaryRequest $request, int $id)
    {
        $diary = Diary::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $diary->update($request->validated());
        $diary->load('attachments');

        return ApiResponse::success(new DiaryResource($diary));
    }

    public function destroy(Request $request, int $id)
    {
        $diary = Diary::query()
            ->where('user_id', CurrentUser::id())
            ->find($id);

        if (!$diary) {
            return ApiResponse::error('NOT_FOUND', 'Diary not found.', null, 404);
        }

        $diary->delete();

        return ApiResponse::success(null);
    }
}
