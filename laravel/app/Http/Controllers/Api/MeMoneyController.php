<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalMoneyEntry;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class MeMoneyController extends Controller
{
    public function index(Request $request)
    {
        $userId = CurrentUser::id();

        $query = PersonalMoneyEntry::where('user_id', $userId);

        if ($from = $request->query('from')) {
            $query->where('date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('date', '<=', $to);
        }

        $limit = min((int) ($request->query('limit', '50')), 200);
        $cursor = $request->query('cursor');

        if ($cursor) {
            $query->where('id', '<', $cursor);
        }

        $entries = $query->orderByDesc('date')->orderByDesc('id')->limit($limit + 1)->get();

        $hasMore = $entries->count() > $limit;
        if ($hasMore) {
            $entries = $entries->take($limit);
        }

        $nextCursor = $hasMore ? (string) $entries->last()->id : null;

        return ApiResponse::success(
            $entries->map(fn ($e) => [
                'id' => $e->id,
                'date' => $e->date->format('Y-m-d'),
                'type' => $e->type,
                'amountJpy' => $e->amount_jpy,
                'category' => $e->category,
                'note' => $e->note,
                'createdAt' => $e->created_at?->toIso8601String(),
            ])->values(),
            $nextCursor ? ['nextCursor' => $nextCursor] : null,
        );
    }

    public function store(Request $request)
    {
        $userId = CurrentUser::id();

        $validated = $request->validate([
            'date' => 'required|date',
            'type' => 'required|in:income,expense',
            'amount_jpy' => 'required|integer|min:1',
            'category' => 'nullable|string|max:64',
            'note' => 'nullable|string|max:255',
        ]);

        $entry = PersonalMoneyEntry::create($validated + ['user_id' => $userId]);

        return ApiResponse::success([
            'id' => $entry->id,
            'date' => $entry->date->format('Y-m-d'),
            'type' => $entry->type,
            'amountJpy' => $entry->amount_jpy,
            'category' => $entry->category,
            'note' => $entry->note,
            'createdAt' => $entry->created_at?->toIso8601String(),
        ], null, 201);
    }

    public function update(Request $request, int $id)
    {
        $userId = CurrentUser::id();

        $entry = PersonalMoneyEntry::where('user_id', $userId)->findOrFail($id);

        $validated = $request->validate([
            'date' => 'sometimes|date',
            'type' => 'sometimes|in:income,expense',
            'amount_jpy' => 'sometimes|integer|min:1',
            'category' => 'nullable|string|max:64',
            'note' => 'nullable|string|max:255',
        ]);

        $entry->update($validated);

        return ApiResponse::success([
            'id' => $entry->id,
            'date' => $entry->date->format('Y-m-d'),
            'type' => $entry->type,
            'amountJpy' => $entry->amount_jpy,
            'category' => $entry->category,
            'note' => $entry->note,
            'createdAt' => $entry->created_at?->toIso8601String(),
        ]);
    }

    public function destroy(int $id)
    {
        $userId = CurrentUser::id();

        $entry = PersonalMoneyEntry::where('user_id', $userId)->findOrFail($id);
        $entry->delete();

        return ApiResponse::success(null);
    }
}
