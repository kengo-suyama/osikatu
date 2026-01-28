<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGoodRequest;
use App\Http\Requests\UpdateGoodRequest;
use App\Http\Resources\GoodResource;
use App\Models\Good;
use Illuminate\Http\Request;

class GoodController extends Controller
{
    public function index(Request $request)
    {
        $query = Good::query()
            ->where('user_id', $request->user()->id);

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $goods = $query->orderByDesc('purchase_date')->get();

        return GoodResource::collection($goods);
    }

    public function store(StoreGoodRequest $request)
    {
        $good = Good::create($request->validated() + [
            'user_id' => $request->user()->id,
        ]);

        return (new GoodResource($good))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return new GoodResource($good);
    }

    public function update(UpdateGoodRequest $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $good->update($request->validated());

        return new GoodResource($good);
    }

    public function destroy(Request $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $good->delete();

        return response()->noContent();
    }
}
