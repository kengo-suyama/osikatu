<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDiaryRequest;
use App\Http\Requests\UpdateDiaryRequest;
use App\Http\Resources\DiaryResource;
use App\Models\Diary;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class DiaryController extends Controller
{
    public function index(Request $request)
    {
        $query = Diary::query()
            ->where('user_id', CurrentUser::id());

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $diaries = $query->orderByDesc('diary_date')->get();

        return ApiResponse::success(DiaryResource::collection($diaries));
    }

    public function store(StoreDiaryRequest $request)
    {
        $diary = Diary::create($request->validated() + [
            'user_id' => CurrentUser::id(),
        ]);

        return ApiResponse::success(new DiaryResource($diary), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $diary = Diary::query()
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

        return ApiResponse::success(new DiaryResource($diary));
    }

    public function destroy(Request $request, int $id)
    {
        $diary = Diary::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $diary->delete();

        return ApiResponse::success(null);
    }
}
