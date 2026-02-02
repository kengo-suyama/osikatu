<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateExpenseRequest extends ApiFormRequest
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
            'oshi_id' => ['sometimes', 'integer', 'exists:oshis,id'],
            'category' => ['sometimes', 'string', 'max:80'],
            'amount' => ['sometimes', 'integer', 'min:1', 'max:100000000'],
            'expense_date' => ['sometimes', 'date'],
            'memo' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
