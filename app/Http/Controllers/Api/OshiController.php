<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOshiRequest;
use App\Http\Requests\UpdateOshiRequest;
use App\Http\Resources\OshiResource;
use App\Models\Oshi;
use Illuminate\Http\Request;

class OshiController extends Controller
{
    public function index(Request $request)
    {
        $oshis = Oshi::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->get();

        return OshiResource::collection($oshis);
    }

    public function store(StoreOshiRequest $request)
    {
        $oshi = Oshi::create($request->validated() + [
            'user_id' => $request->user()->id,
        ]);

        return (new OshiResource($oshi))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return new OshiResource($oshi);
    }

    public function update(UpdateOshiRequest $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $oshi->update($request->validated());

        return new OshiResource($oshi);
    }

    public function destroy(Request $request, int $id)
    {
        $oshi = Oshi::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $oshi->delete();

        return response()->noContent();
    }
}
