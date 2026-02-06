<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDiaryRequest;
use App\Http\Requests\UpdateDiaryRequest;
use App\Http\Resources\DiaryResource;
use App\Models\Diary;
use Illuminate\Http\Request;

class DiaryController extends Controller
{
    public function index(Request $request)
    {
        $query = Diary::query()
            ->where('user_id', $request->user()->id);

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $diaries = $query->orderByDesc('diary_date')->get();

        return DiaryResource::collection($diaries);
    }

    public function store(StoreDiaryRequest $request)
    {
        $diary = Diary::create($request->validated() + [
            'user_id' => $request->user()->id,
        ]);

        return (new DiaryResource($diary))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, int $id)
    {
        $diary = Diary::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return new DiaryResource($diary);
    }

    public function update(UpdateDiaryRequest $request, int $id)
    {
        $diary = Diary::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $diary->update($request->validated());

        return new DiaryResource($diary);
    }

    public function destroy(Request $request, int $id)
    {
        $diary = Diary::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $diary->delete();

        return response()->noContent();
    }
}
