<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExpenseSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'month' => ['nullable', 'date_format:Y-m'],
            'oshi_id' => [
                'nullable',
                'integer',
                Rule::exists('oshis', 'id')->where('user_id', $this->user()->id),
            ],
        ];
    }
}
