<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMediaLinkRequest;
use App\Http\Resources\MediaLinkResource;
use App\Models\MediaLink;
use App\Support\ApiResponse;
use App\Support\CurrentUser;

class MediaLinkController extends Controller
{
    public function store(StoreMediaLinkRequest $request)
    {
        $mediaLink = MediaLink::create($request->validated() + [
            'user_id' => CurrentUser::id(),
        ]);

        return ApiResponse::success(new MediaLinkResource($mediaLink), null, 201);
    }
}
