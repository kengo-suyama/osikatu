<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleRequest;
use App\Http\Requests\UpdateScheduleRequest;
use App\Http\Resources\ScheduleResource;
use App\Models\Schedule;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = Schedule::query()
            ->where('user_id', CurrentUser::id());

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $schedules = $query->orderBy('start_datetime')->get();

        return ApiResponse::success(ScheduleResource::collection($schedules));
    }

    public function store(StoreScheduleRequest $request)
    {
        $schedule = Schedule::create($request->validated() + [
            'user_id' => CurrentUser::id(),
        ]);

        return ApiResponse::success(new ScheduleResource($schedule), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $schedule = Schedule::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        return ApiResponse::success(new ScheduleResource($schedule));
    }

    public function update(UpdateScheduleRequest $request, int $id)
    {
        $schedule = Schedule::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $schedule->update($request->validated());

        return ApiResponse::success(new ScheduleResource($schedule));
    }

    public function destroy(Request $request, int $id)
    {
        $schedule = Schedule::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $schedule->delete();

        return ApiResponse::success(null);
    }
}
