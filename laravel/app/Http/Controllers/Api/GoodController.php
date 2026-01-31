<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGoodRequest;
use App\Http\Requests\UpdateGoodRequest;
use App\Http\Resources\GoodResource;
use App\Models\Good;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class GoodController extends Controller
{
    public function index(Request $request)
    {
        $query = Good::query()
            ->where('user_id', CurrentUser::id());

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $goods = $query->orderByDesc('purchase_date')->get();

        return ApiResponse::success(GoodResource::collection($goods));
    }

    public function store(StoreGoodRequest $request)
    {
        $good = Good::create($request->validated() + [
            'user_id' => CurrentUser::id(),
        ]);

        return ApiResponse::success(new GoodResource($good), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        return ApiResponse::success(new GoodResource($good));
    }

    public function update(UpdateGoodRequest $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $good->update($request->validated());

        return ApiResponse::success(new GoodResource($good));
    }

    public function destroy(Request $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $good->delete();

        return ApiResponse::success(null);
    }
}
