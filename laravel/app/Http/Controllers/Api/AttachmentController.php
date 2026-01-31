<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class AttachmentController extends Controller
{
    public function store(StoreAttachmentRequest $request)
    {
        $relatedClass = $request->relatedModelClass();

        $related = $relatedClass::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($request->validated('related_id'));

        $attachment = Attachment::create([
            'user_id' => CurrentUser::id(),
            'related_type' => $relatedClass,
            'related_id' => $related->id,
            'file_path' => $request->validated('file_path'),
            'file_type' => $request->validated('file_type'),
        ]);

        return ApiResponse::success(new AttachmentResource($attachment), null, 201);
    }

    public function destroy(Request $request, int $id)
    {
        $attachment = Attachment::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $attachment->delete();

        return ApiResponse::success(null);
    }
}
