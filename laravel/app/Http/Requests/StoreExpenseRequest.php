<?php

declare(strict_types=1);

namespace App\Http\Requests;

class StoreExpenseRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $data = [];

        $oshiId = $this->input('oshiId', $this->input('oshi_id'));
        if ($oshiId !== null) {
            $data['oshi_id'] = $oshiId;
        }

        $expenseDate = $this->input('expenseDate', $this->input('expense_date'));
        if ($expenseDate !== null) {
            $data['expense_date'] = $expenseDate;
        }

        if (!empty($data)) {
            $this->merge($data);
        }
    }

    public function rules(): array
    {
        return [
            'oshi_id' => ['required', 'integer', 'exists:oshis,id'],
            'category' => ['required', 'string', 'max:80'],
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'expense_date' => ['required', 'date'],
            'memo' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
