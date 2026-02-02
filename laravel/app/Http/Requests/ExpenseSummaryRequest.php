<?php

declare(strict_types=1);

namespace App\Http\Requests;

class ExpenseSummaryRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'oshi_id' => $this->input('oshiId', $this->input('oshi_id')),
        ]);
    }

    public function rules(): array
    {
        return [
            'month' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
            'oshi_id' => ['nullable', 'integer', 'exists:oshis,id'],
        ];
    }
}
