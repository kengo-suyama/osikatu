<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CircleResource;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CircleController extends Controller
{
    public function index()
    {
        $userId = CurrentUser::id();

        $circles = Circle::query()
            ->whereHas('members', function ($query) use ($userId): void {
                $query->where('user_id', $userId);
            })
            ->with('uiSetting')
            ->withCount('members')
            ->orderByDesc('id')
            ->get();

        $roles = CircleMember::query()
            ->where('user_id', $userId)
            ->pluck('role', 'circle_id');

        $circles->each(function (Circle $circle) use ($roles): void {
            $circle->setAttribute('my_role', $roles[$circle->id] ?? null);
        });

        return ApiResponse::success(CircleResource::collection($circles));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'oshiLabel' => ['required', 'string', 'max:60'],
            'oshiTag' => ['nullable', 'string', 'max:30'],
            'oshiTags' => ['required', 'array', 'min:1', 'max:3'],
            'oshiTags.*' => ['string', 'max:30'],
            'isPublic' => ['nullable', 'boolean'],
            'approvalRequired' => ['nullable', 'boolean'],
            'joinPolicy' => ['nullable', 'in:request,instant'],
            'maxMembers' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $userId = CurrentUser::id();
        $user = User::query()->find($userId);

        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        if ($user->plan !== 'plus' && !PlanGate::isTrialActive($user)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to create circles.', null, 403);
        }

        $rawTags = $data['oshiTags'] ?? [];
        $normalizedTags = [];
        foreach ($rawTags as $tag) {
            if (!is_string($tag)) {
                continue;
            }
            $trimmed = trim(ltrim($tag, '#'));
            if ($trimmed === '') {
                continue;
            }
            $normalizedTags[] = $trimmed;
        }
        $tags = array_values(array_unique($normalizedTags));

        if (empty($tags) || count($tags) > 3) {
            return ApiResponse::error('VALIDATION_ERROR', 'Oshi tags are required', [
                'oshiTags' => ['At least one tag is required.'],
            ], 422);
        }

        if (count($tags) !== count($normalizedTags)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Oshi tags must be unique', [
                'oshiTags' => ['Duplicate tags are not allowed.'],
            ], 422);
        }

        $approvalRequired = $data['approvalRequired'] ?? null;
        $joinPolicy = $data['joinPolicy'] ?? null;
        if ($joinPolicy === null && $approvalRequired !== null) {
            $joinPolicy = $approvalRequired ? 'request' : 'instant';
        }

        $circle = Circle::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'oshi_label' => $data['oshiLabel'],
            'oshi_tag' => $data['oshiTag'] ?? $tags[0] ?? null,
            'oshi_tags' => $tags,
            'is_public' => (bool) ($data['isPublic'] ?? false),
            'join_policy' => $joinPolicy ?? 'request',
            'max_members' => $data['maxMembers'] ?? 30,
            'plan' => 'plus',
            'plan_required' => 'free',
            'created_by' => $userId,
        ]);

        $deviceId = $request->header('X-Device-Id');
        $meProfile = MeProfileResolver::resolve($deviceId);

        CircleMember::create([
            'circle_id' => $circle->id,
            'me_profile_id' => $meProfile?->id,
            'user_id' => $userId,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        $circle->loadCount('members');

        return ApiResponse::success(new CircleResource($circle), null, 201);
    }

    public function show(int $circle)
    {
        $userId = CurrentUser::id();

        $circle = Circle::query()
            ->where('id', $circle)
            ->with('uiSetting')
            ->withCount('members')
            ->first();

        if (!$circle) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $role = CircleMember::query()
            ->where('circle_id', $circle->id)
            ->where('user_id', $userId)
            ->value('role');
        if (!$role) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }
        $circle->setAttribute('my_role', $role);

        return ApiResponse::success(new CircleResource($circle));
    }

    public function destroy(int $circle)
    {
        $userId = CurrentUser::id();

        $circle = Circle::query()
            ->where('id', $circle)
            ->whereHas('members', function ($query) use ($userId): void {
                $query->where('user_id', $userId);
            })
            ->first();

        if (!$circle) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $circle->delete();

        return ApiResponse::success(null);
    }

    public function search(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'q' => ['nullable', 'string', 'max:50'],
            'tag' => ['nullable', 'string', 'max:30'],
            'oshi' => ['nullable', 'string', 'max:60'],
            'label' => ['nullable', 'string', 'max:60'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $name = $data['q'] ?? null;
        $tag = $data['tag'] ?? null;
        $label = $data['oshi'] ?? ($data['label'] ?? null);

        $query = Circle::query()->where('is_public', true);

        if (!empty($tag)) {
            $query->where(function ($builder) use ($tag): void {
                $builder->whereJsonContains('oshi_tags', $tag)
                    ->orWhere('oshi_tag', 'like', '%' . $tag . '%')
                    ->orWhere('oshi_tags', 'like', '%' . $tag . '%');
            });
        }

        if (!empty($label)) {
            $query->where('oshi_label', 'like', '%' . $label . '%');
        }

        if (!empty($name)) {
            $query->where('name', 'like', '%' . $name . '%');
        }

        $circles = $query
            ->with('uiSetting')
            ->withCount('members')
            ->orderByRaw('last_activity_at is null')
            ->orderByDesc('last_activity_at')
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get();

        return ApiResponse::success(CircleResource::collection($circles));
    }
}
