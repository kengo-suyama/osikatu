<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGoodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'oshi_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('oshis', 'id')->where('user_id', $this->user()->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:255'],
            'purchase_date' => ['sometimes', 'required', 'date'],
            'price' => ['sometimes', 'required', 'integer', 'min:0'],
            'image_path' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'memo' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
