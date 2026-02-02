<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeProfile;
use App\Models\UserBudget;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;

final class BudgetController extends Controller
{
    public function show(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return $this->unauthorized();
        }

        $yearMonth = $request->query('yearMonth', Carbon::now()->format('Y-m'));
        $budget = UserBudget::where('user_id', $user->id)
            ->where('year_month', $yearMonth)
            ->first();

        return response()->json([
            'success' => [
                'data' => $this->mapBudget($yearMonth, $budget),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return $this->unauthorized();
        }

        $validator = Validator::make($request->all(), [
            'yearMonth' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
            'budget' => ['required', 'integer', 'min:0', 'max:1000000000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '入力値が不正です',
                    'details' => $validator->errors()->messages(),
                ],
            ], 422);
        }

        $yearMonth = $request->input('yearMonth') ?? Carbon::now()->format('Y-m');
        $budgetInt = $request->input('budget');
        $record = UserBudget::updateOrCreate(
            ['user_id' => $user->id, 'year_month' => $yearMonth],
            [
                'budget_int' => $budgetInt,
                'currency' => 'JPY',
            ]
        );

        return response()->json([
            'success' => [
                'data' => $this->mapBudget($yearMonth, $record),
            ],
        ]);
    }

    private function resolveUser(Request $request)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return null;
        }
        $profile = MeProfile::where('device_id', $deviceId)->first();
        return $profile?->user;
    }

    private function unauthorized()
    {
        return response()->json([
            'error' => [
                'code' => 'UNAUTHORIZED',
                'message' => '認証に失敗しました',
            ],
        ], 401);
    }

    private function mapBudget(string $yearMonth, ?UserBudget $budget): array
    {
        if (!$budget) {
            return [
                'yearMonth' => $yearMonth,
                'budget' => 0,
                'spent' => 0,
                'updatedAt' => null,
            ];
        }

        return [
            'yearMonth' => $budget->year_month,
            'budget' => $budget->budget_int,
            'spent' => $budget->spent_int,
            'updatedAt' => $budget->updated_at?->toIso8601String(),
        ];
    }
}
