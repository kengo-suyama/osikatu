<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMediaLinkRequest;
use App\Http\Resources\MediaLinkResource;
use App\Models\MediaLink;

class MediaLinkController extends Controller
{
    public function store(StoreMediaLinkRequest $request)
    {
        $mediaLink = MediaLink::create($request->validated() + [
            'user_id' => $request->user()->id,
        ]);

        return (new MediaLinkResource($mediaLink))
            ->response()
            ->setStatusCode(201);
    }
}
