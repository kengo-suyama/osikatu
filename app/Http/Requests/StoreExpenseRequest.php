<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'oshi_id' => [
                'required',
                'integer',
                Rule::exists('oshis', 'id')->where('user_id', $this->user()->id),
            ],
            'category' => ['required', 'string', 'max:30'],
            'amount' => ['required', 'integer', 'min:0'],
            'expense_date' => ['required', 'date'],
            'memo' => ['nullable', 'string', 'max:200'],
        ];
    }

    public function messages(): array
    {
        return [
            'oshi_id.required' => trans('validation.custom.expense.oshi_id.required'),
            'oshi_id.integer' => trans('validation.custom.expense.oshi_id.integer'),
            'oshi_id.exists' => trans('validation.custom.expense.oshi_id.exists'),
            'category.required' => trans('validation.custom.expense.category.required'),
            'category.string' => trans('validation.custom.expense.category.string'),
            'category.max' => trans('validation.custom.expense.category.max'),
            'amount.required' => trans('validation.custom.expense.amount.required'),
            'amount.integer' => trans('validation.custom.expense.amount.integer'),
            'amount.min' => trans('validation.custom.expense.amount.min'),
            'expense_date.required' => trans('validation.custom.expense.expense_date.required'),
            'expense_date.date' => trans('validation.custom.expense.expense_date.date'),
            'memo.string' => trans('validation.custom.expense.memo.string'),
            'memo.max' => trans('validation.custom.expense.memo.max'),
        ];
    }

    public function attributes(): array
    {
        return [
            'oshi_id' => trans('validation.attributes.expense.oshi_id'),
            'category' => trans('validation.attributes.expense.category'),
            'amount' => trans('validation.attributes.expense.amount'),
            'expense_date' => trans('validation.attributes.expense.expense_date'),
            'memo' => trans('validation.attributes.expense.memo'),
        ];
    }
}
