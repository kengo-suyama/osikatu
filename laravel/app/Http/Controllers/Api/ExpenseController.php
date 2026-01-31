<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseSummaryRequest;
use App\Http\Requests\StoreExpenseRequest;
use App\Http\Requests\UpdateExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::query()
            ->where('user_id', CurrentUser::id());

        $oshiId = $request->query('oshi_id');
        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $expenses = $query->orderByDesc('expense_date')->get();

        return ApiResponse::success(ExpenseResource::collection($expenses));
    }

    public function store(StoreExpenseRequest $request)
    {
        $expense = Expense::create($request->validated() + [
            'user_id' => CurrentUser::id(),
        ]);

        return ApiResponse::success(new ExpenseResource($expense), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $expense = Expense::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        return ApiResponse::success(new ExpenseResource($expense));
    }

    public function update(UpdateExpenseRequest $request, int $id)
    {
        $expense = Expense::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $expense->update($request->validated());

        return ApiResponse::success(new ExpenseResource($expense));
    }

    public function destroy(Request $request, int $id)
    {
        $expense = Expense::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $expense->delete();

        return ApiResponse::success(null);
    }

    public function summary(ExpenseSummaryRequest $request)
    {
        $month = $request->validated('month');
        $oshiId = $request->validated('oshi_id');

        $start = $month
            ? Carbon::createFromFormat('Y-m', $month)->startOfMonth()
            : Carbon::now()->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $query = Expense::query()
            ->where('user_id', CurrentUser::id())
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()]);

        if (!empty($oshiId)) {
            $query->where('oshi_id', $oshiId);
        }

        $totalAmount = (clone $query)->sum('amount');

        $byOshi = (clone $query)
            ->join('oshis', 'expenses.oshi_id', '=', 'oshis.id')
            ->select(
                'expenses.oshi_id',
                'oshis.name as oshi_name',
                DB::raw('SUM(expenses.amount) as total_amount')
            )
            ->groupBy('expenses.oshi_id', 'oshis.name')
            ->orderByDesc('total_amount')
            ->get();

        $byOshi = $byOshi->map(static function ($row) {
            return [
                'oshiId' => $row->oshi_id,
                'oshiName' => $row->oshi_name,
                'totalAmount' => (int) $row->total_amount,
            ];
        })->values();

        return ApiResponse::success([
            'month' => $start->format('Y-m'),
            'period' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'totalAmount' => (int) $totalAmount,
            'byOshi' => $byOshi,
        ]);
    }
}
